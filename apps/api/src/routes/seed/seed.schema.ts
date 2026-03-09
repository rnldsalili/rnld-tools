import { z } from 'zod';

export const seedRequestSchema = z.object({
  seedToken: z.string().min(1),
});
