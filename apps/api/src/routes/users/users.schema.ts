import { isRoleSlug } from '@workspace/permissions';
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

const roleSlugSchema = z.string().trim().refine(isRoleSlug, {
  message: 'Invalid role slug',
});

export const userRolesUpdateSchema = z.object({
  roleSlugs: z.array(roleSlugSchema).max(50),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
  roleSlugs: z.array(roleSlugSchema).max(50),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1),
  roleSlugs: z.array(roleSlugSchema).max(50),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});
