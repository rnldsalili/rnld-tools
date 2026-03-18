import { permissionCatalog, protectedSystemRoleSlugs } from './catalog';
import { PermissionModule, SystemRoleSlug } from './types';

import type {
  AuthorizationSnapshot,
  GroupedPermissionGrant,
  PermissionAction,
  PermissionGrant,
  RoleSummary,
} from './types';

export const permissionModules = Object.values(PermissionModule) as Array<PermissionModule>;

export function getPermissionActions(module: PermissionModule): Array<PermissionAction> {
  return Object.keys(permissionCatalog[module].actions) as Array<PermissionAction>;
}

export function isPermissionModule(value: unknown): value is PermissionModule {
  return typeof value === 'string'
    && (Object.values(PermissionModule) as Array<string>).includes(value);
}

export function isPermissionAction(
  module: PermissionModule,
  value: unknown,
): value is PermissionAction {
  return typeof value === 'string' && value in permissionCatalog[module].actions;
}

export function flattenPermissions(
  permissions: Array<GroupedPermissionGrant>,
): Array<PermissionGrant> {
  const uniquePermissions = new Map<string, PermissionGrant>();

  for (const permissionGroup of permissions) {
    for (const action of permissionGroup.actions) {
      if (!isPermissionAction(permissionGroup.module, action)) {
        continue;
      }

      const permissionKey = `${permissionGroup.module}:${action}`;
      uniquePermissions.set(permissionKey, {
        module: permissionGroup.module,
        action,
      });
    }
  }

  return Array.from(uniquePermissions.values()).sort(comparePermissionGrants);
}

export function groupPermissionsByModule(
  permissions: Array<PermissionGrant>,
): Array<GroupedPermissionGrant> {
  const groupedPermissions = new Map<PermissionModule, Set<PermissionAction>>();

  for (const permission of permissions) {
    const actionSet = groupedPermissions.get(permission.module) ?? new Set<PermissionAction>();
    actionSet.add(permission.action);
    groupedPermissions.set(permission.module, actionSet);
  }

  return permissionModules
    .filter((module) => groupedPermissions.has(module))
    .map((module) => ({
      module,
      actions: getPermissionActions(module).filter((action) => groupedPermissions.get(module)?.has(action)),
    }));
}

export function hasRole(roles: Array<Pick<RoleSummary, 'slug'>>, slug: string) {
  return roles.some((role) => role.slug === slug);
}

export function hasSuperAdminRole(roles: Array<Pick<RoleSummary, 'slug'>>) {
  return hasRole(roles, SystemRoleSlug.SUPER_ADMIN);
}

export function isProtectedSystemRoleSlug(slug: string): slug is SystemRoleSlug {
  return protectedSystemRoleSlugs.includes(slug as SystemRoleSlug);
}

export function createAuthorizationSnapshot(input: {
  roles: Array<RoleSummary>;
  permissions: Array<PermissionGrant>;
}): AuthorizationSnapshot {
  return {
    roles: input.roles,
    permissions: input.permissions.sort(comparePermissionGrants),
    hasSuperAdminRole: hasSuperAdminRole(input.roles),
  };
}

function comparePermissionGrants(left: PermissionGrant, right: PermissionGrant) {
  if (left.module === right.module) {
    return left.action.localeCompare(right.action);
  }

  return left.module.localeCompare(right.module);
}
