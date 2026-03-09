import { z } from 'zod';

export const memberIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const memberListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const memberCreateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  middleName: z.string().trim().optional(),
  suffix: z.string().trim().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  dateOfBirth: z.string().trim().optional(),
  image: z.string().trim().optional(),
  familyId: z.string().trim().optional(),
});

export const memberUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    middleName: z.string().trim().optional(),
    suffix: z.string().trim().optional(),
    gender: z.enum(['MALE', 'FEMALE']),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    dateOfBirth: z.string().trim().optional(),
    image: z.string().trim().optional(),
    familyId: z.string().trim().optional(),
  });
