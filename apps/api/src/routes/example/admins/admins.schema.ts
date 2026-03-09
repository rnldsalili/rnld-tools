import { z } from 'zod';

export const adminIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const adminCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim(),
  password: z.string().trim().min(8),
  image: z.string().trim().optional(),
}).refine(
  (data) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
  { message: 'Invalid email address', path: ['email'] },
);

export const adminUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().optional(),
  image: z.string().trim().optional(),
}).refine(
  (data) => !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
  { message: 'Invalid email address', path: ['email'] },
);

export const adminPasswordUpdateSchema = z.object({
  password: z.string().trim().min(8),
});
