import { z } from 'zod';

const VALID_TYPES = ['INCOME', 'EXPENSE'] as const;
const VALID_SORT_FIELDS = ['date', 'amount', 'createdAt', 'category'] as const;
const VALID_SORT_ORDERS = ['asc', 'desc'] as const;

export const createRecordSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be a positive number'),
  type: z.enum(VALID_TYPES, { required_error: 'Type must be INCOME or EXPENSE' }),
  category: z.string().min(1, 'Category is required').max(100),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date format'),
  notes: z.string().max(1000).optional(),
});

export const updateRecordSchema = z.object({
  amount: z.number().positive('Amount must be a positive number').optional(),
  type: z.enum(VALID_TYPES).optional(),
  category: z.string().min(1).max(100).optional(),
  date: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date format')
    .optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided',
);

export const listRecordsQuerySchema = z.object({
  // Filters
  type: z.enum(VALID_TYPES).optional(),
  category: z.string().optional(),
  dateFrom: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid dateFrom format')
    .optional(),
  dateTo: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid dateTo format')
    .optional(),
  // Full-text search across category and notes
  search: z.string().optional(),
  // Sorting
  sortBy: z.enum(VALID_SORT_FIELDS).optional().default('date'),
  sortOrder: z.enum(VALID_SORT_ORDERS).optional().default('desc'),
  // Pagination
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
