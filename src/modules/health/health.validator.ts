import { z } from 'zod';

/**
 * Ready check query parameters (optional filtering).
 */
export const readyCheckQuerySchema = z.object({
  include: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
});

export type ReadyCheckQuery = z.infer<typeof readyCheckQuerySchema>;
