import { limitValidator, pageValidator, searchValidator } from '@workspace/constants';
import { z } from 'zod';

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const usersListQuerySchema = z.object({
  search: searchValidator,
  page: pageValidator,
  limit: limitValidator,
});

export const userRolesUpdateSchema = z.object({
  roleIds: z.array(z.string().trim().min(1)).max(50),
});
