import { z } from 'zod';

export const documentTokenParamSchema = z.object({
  token: z.string().trim().min(1),
});

export const documentSignSchema = z.object({
  signatureData: z.string().min(1).optional(),
});
