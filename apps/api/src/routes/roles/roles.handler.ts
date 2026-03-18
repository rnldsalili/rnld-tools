import {
  flattenPermissions,
  groupPermissionsByModule,
  isPermissionAction,
  isPermissionModule,
  isProtectedSystemRoleSlug,
} from '@workspace/permissions';

import { roleIdParamSchema, roleUpsertSchema } from './roles.schema';
import type { GroupedPermissionGrant, PermissionGrant } from '@workspace/permissions';
import { createHandlers } from '@/api/app';
import { toRoleSummary } from '@/api/lib/authorization';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';


export const getRoles = createHandlers(
  async (c) => {
    const prisma = initializePrisma(c.env);

    const roles = await prisma.role.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 200, message: 'Roles retrieved successfully' },
      data: {
        roles: roles.map((role) => serializeRole(role)),
      },
    }, 200);
  },
);

export const getRole = createHandlers(
  validate('param', roleIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const roleFound = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!roleFound) {
      return c.json({ meta: { code: 404, message: 'Role not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'Role retrieved successfully' },
      data: {
        role: serializeRole(roleFound),
      },
    }, 200);
  },
);

export const createRole = createHandlers(
  validate('json', roleUpsertSchema),
  async (c) => {
    const rolePayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const slug = await getUniqueRoleSlug(prisma, rolePayload.name);
    const permissions = flattenPermissions(toGroupedPermissionGrants(rolePayload.permissions));

    const createdRole = await prisma.role.create({
      data: {
        slug,
        name: rolePayload.name.trim(),
        description: rolePayload.description?.trim() || null,
        permissions: {
          create: permissions.map((permission) => ({
            module: permission.module,
            action: permission.action,
          })),
        },
      },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 201, message: 'Role created successfully' },
      data: {
        role: serializeRole(createdRole),
      },
    }, 201);
  },
);

export const updateRole = createHandlers(
  validate('param', roleIdParamSchema),
  validate('json', roleUpsertSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const rolePayload = c.req.valid('json');
    const prisma = initializePrisma(c.env);

    const roleFound = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!roleFound) {
      return c.json({ meta: { code: 404, message: 'Role not found' } }, 404);
    }

    if (isProtectedSystemRoleSlug(roleFound.slug)) {
      return c.json({ meta: { code: 403, message: 'Protected system roles cannot be modified' } }, 403);
    }

    const permissions = flattenPermissions(toGroupedPermissionGrants(rolePayload.permissions));
    const nextSlug = roleFound.isSystem
      ? roleFound.slug
      : await getUniqueRoleSlug(prisma, rolePayload.name, roleFound.id);

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        slug: nextSlug,
        name: rolePayload.name.trim(),
        description: rolePayload.description?.trim() || null,
        permissions: {
          deleteMany: {},
          create: permissions.map((permission) => ({
            module: permission.module,
            action: permission.action,
          })),
        },
      },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 200, message: 'Role updated successfully' },
      data: {
        role: serializeRole(updatedRole),
      },
    }, 200);
  },
);

export const deleteRole = createHandlers(
  validate('param', roleIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const roleFound = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!roleFound) {
      return c.json({ meta: { code: 404, message: 'Role not found' } }, 404);
    }

    if (isProtectedSystemRoleSlug(roleFound.slug)) {
      return c.json({ meta: { code: 403, message: 'Protected system roles cannot be deleted' } }, 403);
    }

    if (roleFound._count.userRoles > 0) {
      return c.json({
        meta: {
          code: 409,
          message: 'Cannot delete a role that is assigned to users',
        },
      }, 409);
    }

    await prisma.role.delete({
      where: { id },
    });

    return c.json({ meta: { code: 200, message: 'Role deleted successfully' } }, 200);
  },
);

function serializeRole(role: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    module: string;
    action: string;
  }>;
  _count: {
    userRoles: number;
  };
}) {
  return {
    ...toRoleSummary(role),
    userCount: role._count.userRoles,
    permissions: groupPermissionsByModule(getRolePermissionGrants(role.permissions)),
  };
}

function getRolePermissionGrants(
  permissions: Array<{
    module: string;
    action: string;
  }>,
): Array<PermissionGrant> {
  return permissions
    .filter((permission): permission is PermissionGrant => (
      isPermissionModule(permission.module)
      && isPermissionAction(permission.module, permission.action)
    ))
    .map((permission) => ({
      module: permission.module,
      action: permission.action,
    }));
}

function toGroupedPermissionGrants(
  permissions: Array<{
    module: string;
    actions: Array<string>;
  }>,
): Array<GroupedPermissionGrant> {
  return permissions
    .filter((permission): permission is GroupedPermissionGrant => {
      if (!isPermissionModule(permission.module)) {
        return false;
      }

      const permissionModule = permission.module;

      return permission.actions.every((action) => isPermissionAction(permissionModule, action));
    })
    .map((permission) => ({
      module: permission.module,
      actions: permission.actions,
    }));
}

async function getUniqueRoleSlug(
  prisma: ReturnType<typeof initializePrisma>,
  roleName: string,
  excludeRoleId?: string,
) {
  const baseSlug = toRoleSlug(roleName);
  let candidateSlug = baseSlug;
  let collisionIndex = 1;

  for (;;) {
    const existingRole = await prisma.role.findFirst({
      where: {
        slug: candidateSlug,
        ...(excludeRoleId ? { id: { not: excludeRoleId } } : {}),
      },
      select: { id: true },
    });

    if (!existingRole) {
      return candidateSlug;
    }

    collisionIndex += 1;
    candidateSlug = `${baseSlug}-${collisionIndex}`;
  }
}

function toRoleSlug(value: string) {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedValue || `role-${crypto.randomUUID().slice(0, 8)}`;
}
