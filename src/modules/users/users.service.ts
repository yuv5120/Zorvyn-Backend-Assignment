import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { parsePagination, toPrismaPagination, buildMeta } from '../../utils/pagination';
import type { CreateUserInput, UpdateUserInput } from './users.schema';

const SALT_ROUNDS = 10;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(query: Record<string, unknown>) {
  const pagination = parsePagination(query);
  const where = {
    ...(query.role ? { role: String(query.role) } : {}),
    ...(query.status ? { status: String(query.status) } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
      ...toPrismaPagination(pagination),
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildMeta(total, pagination) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name, role: input.role },
    select: USER_SELECT,
  });
}

export async function updateUser(id: string, input: UpdateUserInput, requesterId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  // Prevent admin from deactivating themselves
  if (id === requesterId && input.status === 'INACTIVE') {
    throw new BadRequestError('You cannot deactivate your own account');
  }

  return prisma.user.update({
    where: { id },
    data: input,
    select: USER_SELECT,
  });
}

export async function deactivateUser(id: string, requesterId: string) {
  if (id === requesterId) {
    throw new BadRequestError('You cannot deactivate your own account');
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User');

  // Soft-deactivate rather than hard delete to preserve referential integrity
  return prisma.user.update({
    where: { id },
    data: { status: 'INACTIVE' },
    select: USER_SELECT,
  });
}
