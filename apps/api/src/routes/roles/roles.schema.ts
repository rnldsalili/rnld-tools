import {
  PermissionAction,
  PermissionModule,
  isPermissionAction,
  isRoleSlug,
} from '@workspace/permissions';
import { z } from 'zod';

const rolePermissionGroupSchema = z.object({
  module: z.nativeEnum(PermissionModule),
  actions: z.array(z.nativeEnum(PermissionAction)).default([]),
}).superRefine((value, context) => {
  for (const [actionIndex, action] of value.actions.entries()) {
    if (!isPermissionAction(value.module, action)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid permission action',
        path: ['actions', actionIndex],
      });
    }
  }
});

export const roleSlugParamSchema = z.object({
  slug: z.string().trim().refine(isRoleSlug, {
    message: 'Invalid role slug',
  }),
});

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(rolePermissionGroupSchema).default([]),
});
