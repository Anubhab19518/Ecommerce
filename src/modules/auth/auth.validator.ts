import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format').max(255),
  password: z.string().min(1, 'Password is required').max(100),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
