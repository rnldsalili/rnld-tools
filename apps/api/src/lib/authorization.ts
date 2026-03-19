import {
  buildAppAbility,
  canAccess,
  createAuthorizationSnapshot,
  isProtectedSystemRoleSlug,
  toPermissionGrants,
  toRoleSummaries,
} from '@workspace/permissions';

import type { AppAbility, PermissionAction, PermissionModule } from '@workspace/permissions';
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
      userRoles: true,
    },
  });

  if (!user) {
    return null;
  }

  const assignedRoleSlugs = user.userRoles.map((userRole) => userRole.roleSlug);
  const rolePermissions = assignedRoleSlugs.length > 0
    ? await prisma.rolePermission.findMany({
      where: {
        roleSlug: {
          in: assignedRoleSlugs,
        },
      },
      select: {
        module: true,
        action: true,
      },
    })
    : [];

  const authorizationSnapshot = createAuthorizationSnapshot({
    roles: toRoleSummaries(assignedRoleSlugs),
    permissions: toPermissionGrants(rolePermissions),
  });

  return {
    ...sessionUser,
    ...authorizationSnapshot,
    mustChangePassword: user.mustChangePassword,
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
