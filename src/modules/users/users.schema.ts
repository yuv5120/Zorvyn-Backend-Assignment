import { z } from 'zod';
import { VALID_ROLES, VALID_STATUSES } from '../../types/roles';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  name: z.string().min(2).max(100),
  role: z.enum(VALID_ROLES).optional().default('VIEWER'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(VALID_ROLES).optional(),
  status: z.enum(VALID_STATUSES).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided',
);

export const listUsersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.enum(VALID_ROLES).optional(),
  status: z.enum(VALID_STATUSES).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
