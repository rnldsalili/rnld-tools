import { z } from 'zod';

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(1),
  image: z.string().trim().optional(),
});

export const accountPasswordUpdateSchema = z.object({
  currentPassword: z.string().trim().min(8),
  newPassword: z.string().trim().min(8),
});
