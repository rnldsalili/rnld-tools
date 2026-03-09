import { z } from 'zod';

export const familyIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const familyListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const familyCreateSchema = z.object({
  name: z.string().trim().min(1),
  image: z.string().trim().optional(),
  address: z.string().trim().optional(),
  primaryContactId: z.string().trim().optional(),
});

export const familyUpdateSchema = z
  .object({
    name: z.string().trim().min(1),
    image: z.string().trim().optional(),
    address: z.string().trim().optional(),
    primaryContactId: z.string().trim().optional(),
  });
