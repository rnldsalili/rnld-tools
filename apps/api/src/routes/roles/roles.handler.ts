import {
  flattenPermissions,
  getAllPermissionGrants,
  groupPermissionsByModule,
  isProtectedRoleSlug,
  roleSlugs,
  toPermissionGrants,
  toRoleSummary,
} from '@workspace/permissions';
import {
  roleSlugParamSchema,
  updateRolePermissionsSchema,
} from './roles.schema';
import { createHandlers } from '@/api/app';
import { validate } from '@/api/lib/validator';
import { initializePrisma } from '@/api/lib/db';

function toRolePermissionKey(permission: { module: string; action: string }) {
  return `${permission.module}:${permission.action}`;
}

export const getRoles = createHandlers(
  async (c) => {
    const prisma = initializePrisma(c.env);
    const [assignedUserRoles, rolePermissions] = await Promise.all([
      prisma.userRole.findMany({
        select: {
          roleSlug: true,
        },
      }),
      prisma.rolePermission.findMany({
        select: {
          roleSlug: true,
          module: true,
          action: true,
        },
      }),
    ]);

    const userCountsByRoleSlug = assignedUserRoles.reduce((counts, userRole) => {
      counts.set(userRole.roleSlug, (counts.get(userRole.roleSlug) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    const permissionsByRoleSlug = rolePermissions.reduce((groupedPermissions, rolePermission) => {
      const permissionList = groupedPermissions.get(rolePermission.roleSlug) ?? [];
      permissionList.push({
        module: rolePermission.module,
        action: rolePermission.action,
      });
      groupedPermissions.set(rolePermission.roleSlug, permissionList);
      return groupedPermissions;
    }, new Map<string, Array<{ module: string; action: string }>>());

    return c.json({
      meta: { code: 200, message: 'Roles retrieved successfully' },
      data: {
        roles: roleSlugs.map((roleSlug) => ({
          ...toRoleSummary(roleSlug, userCountsByRoleSlug.get(roleSlug) ?? 0),
          permissions: groupPermissionsByModule(
            toRoleSummary(roleSlug).hasFullAccess
              ? getAllPermissionGrants()
              : toPermissionGrants(permissionsByRoleSlug.get(roleSlug) ?? []),
          ),
        })),
      },
    }, 200);
  },
);

export const updateRolePermissions = createHandlers(
  validate('param', roleSlugParamSchema),
  validate('json', updateRolePermissionsSchema),
  async (c) => {
    const authenticatedUser = c.get('user');
    const { slug } = c.req.valid('param');
    const { permissions } = c.req.valid('json');

    if (!authenticatedUser.hasSuperAdminRole) {
      return c.json({
        meta: {
          code: 403,
          message: 'Only super admins can update role permissions.',
        },
      }, 403);
    }

    if (isProtectedRoleSlug(slug)) {
      return c.json({
        meta: {
          code: 403,
          message: 'Protected roles cannot be updated.',
        },
      }, 403);
    }

    const prisma = initializePrisma(c.env);
    const normalizedPermissions = flattenPermissions(permissions);
    const existingRolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleSlug: slug,
      },
      select: {
        id: true,
        module: true,
        action: true,
      },
    });

    const nextPermissionKeys = new Set(
      normalizedPermissions.map((permission) => toRolePermissionKey(permission)),
    );
    const staleRolePermissionIds = existingRolePermissions
      .filter((existingRolePermission) => !nextPermissionKeys.has(toRolePermissionKey(existingRolePermission)))
      .map((existingRolePermission) => existingRolePermission.id);
    const existingPermissionKeys = new Set(
      existingRolePermissions.map((existingRolePermission) => toRolePermissionKey(existingRolePermission)),
    );

    if (staleRolePermissionIds.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          id: {
            in: staleRolePermissionIds,
          },
        },
      });
    }

    for (const permission of normalizedPermissions) {
      if (!existingPermissionKeys.has(toRolePermissionKey(permission))) {
        await prisma.rolePermission.create({
          data: {
            roleSlug: slug,
            module: permission.module,
            action: permission.action,
          },
        });
      }
    }

    return c.json({
      meta: { code: 200, message: 'Role permissions updated successfully' },
      data: {
        role: {
          ...toRoleSummary(slug),
          permissions: groupPermissionsByModule(normalizedPermissions),
        },
      },
    }, 200);
  },
);
