import { prisma } from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { parsePagination, toPrismaPagination, buildMeta } from '../../utils/pagination';
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from './records.schema';

const RECORD_SELECT = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

export async function listRecords(query: ListRecordsQuery) {
  const pagination = parsePagination(query as Record<string, unknown>);

  // Build WHERE clause
  // Soft-deleted records are always excluded via deletedAt: null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    deletedAt: null,
    ...(query.type ? { type: query.type } : {}),
    ...(query.category
      ? { category: { contains: query.category } }
      : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
    // Full-text search: matches category OR notes containing the search term
    // SQLite LIKE is already case-insensitive for ASCII characters
    ...(query.search
      ? {
          OR: [
            { category: { contains: query.search } },
            { notes: { contains: query.search } },
          ],
        }
      : {}),
  };

  const orderBy: Record<string, string> = {
    [query.sortBy ?? 'date']: query.sortOrder ?? 'desc',
  };

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      select: RECORD_SELECT,
      orderBy,
      ...toPrismaPagination(pagination),
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return { records, meta: buildMeta(total, pagination) };
}

export async function exportRecords(query: ListRecordsQuery) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    deletedAt: null,
    ...(query.type ? { type: query.type } : {}),
    ...(query.category
      ? { category: { contains: query.category } }
      : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { category: { contains: query.search } },
            { notes: { contains: query.search } },
          ],
        }
      : {}),
  };

  const orderBy: Record<string, string> = {
    [query.sortBy ?? 'date']: query.sortOrder ?? 'desc',
  };

  return prisma.financialRecord.findMany({
    where,
    orderBy,
  });
}

export async function getRecordById(id: string) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, deletedAt: null },
    select: RECORD_SELECT,
  });
  if (!record) throw new NotFoundError('Financial record');
  return record;
}

export async function createRecord(input: CreateRecordInput, userId: string) {
  return prisma.financialRecord.create({
    data: {
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: new Date(input.date),
      notes: input.notes,
      userId,
    },
    select: RECORD_SELECT,
  });
}

export async function updateRecord(
  id: string,
  input: UpdateRecordInput,
  requesterId: string,
  requesterRole: string,
) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, deletedAt: null },
  });
  if (!record) throw new NotFoundError('Financial record');

  // Analysts can only update records they created; Admins can update any
  if (requesterRole === 'ANALYST' && record.userId !== requesterId) {
    throw new ForbiddenError('Analysts can only update records they created');
  }

  return prisma.financialRecord.update({
    where: { id },
    data: {
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: input.date ? new Date(input.date) : undefined,
      notes: input.notes,
    },
    select: RECORD_SELECT,
  });
}

export async function softDeleteRecord(id: string) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, deletedAt: null },
  });
  if (!record) throw new NotFoundError('Financial record');

  // Soft delete: set deletedAt timestamp — data is preserved permanently
  return prisma.financialRecord.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true, deletedAt: true },
  });
}
