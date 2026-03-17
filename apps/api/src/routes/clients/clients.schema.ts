import {
  CLIENT_STATUSES,
  ClientStatus,
  pageValidator,
  searchValidator,
} from '@workspace/constants';
import { z } from 'zod';

const clientListLimitValidator = z.coerce.number().int().min(1).max(1000).default(10);

export const clientIdParamSchema = z.object({
  id: z.string().trim().length(25),
});

export const clientListQuerySchema = z.object({
  search: searchValidator,
  status: z.enum(CLIENT_STATUSES).optional(),
  page: pageValidator,
  limit: clientListLimitValidator,
});

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().pipe(z.email()).optional(),
  address: z.string().trim().optional(),
  status: z.enum(CLIENT_STATUSES).default(ClientStatus.ENABLED),
});

export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().pipe(z.email()).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  status: z.enum(CLIENT_STATUSES).optional(),
});
