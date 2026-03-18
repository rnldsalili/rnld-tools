import {
  buildAppAbility,
  canAccess,
  createAuthorizationSnapshot,
  flattenPermissions,
  isPermissionAction,
  isPermissionModule,
  isProtectedSystemRoleSlug,
} from '@workspace/permissions';

import type { AppAbility, PermissionAction, PermissionModule, RoleSummary } from '@workspace/permissions';
import type { PrismaClient } from '@/prisma/client';
import type { AuthSessionUser, AuthenticatedUser } from '@/api/app';

export async function getAuthenticatedUser(
  prisma: PrismaClient,
  sessionUser: AuthSessionUser,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
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

  if (!user) {
    return null;
  }

  const authorizationSnapshot = createAuthorizationSnapshot({
    roles: user.userRoles.map(({ role }) => toRoleSummary(role)),
    permissions: flattenPermissions(getGroupedRolePermissions(user.userRoles)),
  });

  return {
    ...sessionUser,
    ...authorizationSnapshot,
  };
}

export function buildAbilityForUser(user: Pick<AuthenticatedUser, 'permissions' | 'hasSuperAdminRole'>) {
  return buildAppAbility(user.permissions, user.hasSuperAdminRole);
}

export function userCanAccess(
  user: Pick<AuthenticatedUser, 'permissions' | 'hasSuperAdminRole'>,
  module: PermissionModule,
  action: PermissionAction,
) {
  return canAccess(buildAbilityForUser(user), module, action);
}

export function abilityCanAccess(
  ability: AppAbility,
  module: PermissionModule,
  action: PermissionAction,
) {
  return canAccess(ability, module, action);
}

export function isProtectedSystemRole(slug: string) {
  return isProtectedSystemRoleSlug(slug);
}

function getGroupedRolePermissions(
  userRoles: Array<{
    role: {
      permissions: Array<{
        module: string;
        action: string;
      }>;
    };
  }>,
) {
  const permissionsByModule = new Map<PermissionModule, Set<PermissionAction>>();

  for (const { role } of userRoles) {
    for (const permission of role.permissions) {
      if (!isPermissionModule(permission.module) || !isPermissionAction(permission.module, permission.action)) {
        continue;
      }

      const actionSet = permissionsByModule.get(permission.module) ?? new Set<PermissionAction>();
      actionSet.add(permission.action);
      permissionsByModule.set(permission.module, actionSet);
    }
  }

  return Array.from(permissionsByModule.entries()).map(([module, actions]) => ({
    module,
    actions: Array.from(actions),
  }));
}

export function toRoleSummary(role: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}): RoleSummary {
  return {
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
  };
}
