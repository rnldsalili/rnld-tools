import { PermissionAction, PermissionModule, isPermissionAction, isPermissionModule } from '@workspace/permissions';
import { z } from 'zod';

export const roleIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

const rolePermissionGroupSchema = z.object({
  module: z.nativeEnum(PermissionModule),
  actions: z.array(z.nativeEnum(PermissionAction)).default([]),
}).superRefine((value, context) => {
  if (!isPermissionModule(value.module)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid permission module',
      path: ['module'],
    });
    return;
  }

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

export const roleUpsertSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  permissions: z.array(rolePermissionGroupSchema).default([]),
});
