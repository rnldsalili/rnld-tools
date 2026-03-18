import { flattenPermissions, isPermissionAction, isPermissionModule } from '@workspace/permissions';
import { userIdParamSchema, userRolesUpdateSchema, usersListQuerySchema } from './users.schema';
import type { PermissionGrant } from '@workspace/permissions';
import type { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { toRoleSummary } from '@/api/lib/authorization';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';


export const getCurrentUser = createHandlers(
  async (c) => {
    const prisma = initializePrisma(c.env);
    const currentUserId = c.get('user').id;

    const userFound = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!userFound) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    const roles = userFound.userRoles.map(({ role }) => toRoleSummary(role));

    return c.json({
      meta: { code: 200, message: 'Current user retrieved successfully' },
      data: {
        user: {
          id: userFound.id,
          name: userFound.name,
          email: userFound.email,
          emailVerified: userFound.emailVerified,
          image: userFound.image,
          createdAt: userFound.createdAt,
          updatedAt: userFound.updatedAt,
        },
        roles,
        permissions: flattenPermissions(getGroupedPermissions(userFound.userRoles)),
      },
    }, 200);
  },
);

export const getUsers = createHandlers(
  validate('query', usersListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);
    const skipCount = (page - 1) * limit;
    const normalizedSearch = search?.trim();
    const userFilter: Prisma.UserWhereInput = normalizedSearch
      ? {
        OR: [
          { name: { contains: normalizedSearch } },
          { email: { contains: normalizedSearch } },
        ],
      }
      : {};

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take: limit,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
      prisma.user.count({ where: userFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Users retrieved successfully' },
      data: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles: user.userRoles.map(({ role }) => toRoleSummary(role)),
        })),
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
        },
      },
    }, 200);
  },
);

export const updateUserRoles = createHandlers(
  validate('param', userIdParamSchema),
  validate('json', userRolesUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { roleIds } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const uniqueRoleIds = Array.from(new Set(roleIds));

    const [userFound, roles] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
      uniqueRoleIds.length > 0
        ? prisma.role.findMany({
          where: {
            id: {
              in: uniqueRoleIds,
            },
          },
        })
        : Promise.resolve([]),
    ]);

    if (!userFound) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    if (roles.length !== uniqueRoleIds.length) {
      return c.json({ meta: { code: 422, message: 'One or more roles are invalid' } }, 422);
    }

    const existingRoleIds = new Set(userFound.userRoles.map((userRole) => userRole.roleId));
    const nextRoleIds = new Set(uniqueRoleIds);

    await prisma.userRole.deleteMany({
      where: {
        userId: id,
        ...(uniqueRoleIds.length > 0
          ? {
            roleId: {
              notIn: uniqueRoleIds,
            },
          }
          : {}),
      },
    });

    for (const roleId of uniqueRoleIds) {
      if (!existingRoleIds.has(roleId)) {
        await prisma.userRole.create({
          data: {
            userId: id,
            roleId,
          },
        });
      }
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!updatedUser) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'User roles updated successfully' },
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          image: updatedUser.image,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          roles: updatedUser.userRoles
            .filter((userRole) => nextRoleIds.has(userRole.roleId))
            .map(({ role }) => toRoleSummary(role)),
        },
      },
    }, 200);
  },
);

function getGroupedPermissions(
  userRoles: Array<{
    role: {
      permissions: Array<{
        module: string;
        action: string;
      }>;
    };
  }>,
) {
  const permissionsByModule = new Map<PermissionGrant['module'], Set<PermissionGrant['action']>>();

  for (const { role } of userRoles) {
    for (const permission of role.permissions) {
      if (!isPermissionModule(permission.module) || !isPermissionAction(permission.module, permission.action)) {
        continue;
      }

      const actionSet = permissionsByModule.get(permission.module) ?? new Set<PermissionGrant['action']>();
      actionSet.add(permission.action);
      permissionsByModule.set(permission.module, actionSet);
    }
  }

  return Array.from(permissionsByModule.entries()).map(([module, actions]) => ({
    module,
    actions: Array.from(actions),
  }));
}
