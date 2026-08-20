import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  name: z.string().min(1, 'Name is required').max(255),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255).optional(),
  name: z.string().min(1, 'Name is required').max(255).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
