import { permissionCatalog, protectedRoleSlugs, roleCatalog } from './catalog';
import { PermissionModule, RoleSlug, SystemRoleSlug } from './types';

import type {
  AuthorizationSnapshot,
  GroupedPermissionGrant,
  PermissionAction,
  PermissionGrant,
  RoleDefinition,
  RoleSummary,
} from './types';

export const permissionModules = Object.values(PermissionModule) as Array<PermissionModule>;
export const roleSlugs = Object.values(RoleSlug) as Array<RoleSlug>;

export function getPermissionActions(module: PermissionModule): Array<PermissionAction> {
  return Object.keys(permissionCatalog[module].actions) as Array<PermissionAction>;
}

export function getPermissionModuleLabel(module: PermissionModule) {
  return permissionCatalog[module].label;
}

export function getPermissionActionLabel(module: PermissionModule, action: PermissionAction) {
  const moduleActions = permissionCatalog[module].actions as Partial<Record<PermissionAction, string>>;
  return moduleActions[action] ?? action;
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

export function isRoleSlug(value: unknown): value is RoleSlug {
  return typeof value === 'string'
    && (Object.values(RoleSlug) as Array<string>).includes(value);
}

export function getRoleDefinition(roleSlug: RoleSlug): RoleDefinition {
  return roleCatalog[roleSlug];
}

export function getAllPermissionGrants(): Array<PermissionGrant> {
  return permissionModules.flatMap((module) => (
    getPermissionActions(module).map((action) => ({
      module,
      action,
    }))
  )).sort(comparePermissionGrants);
}

export function toPermissionGrants(input: Array<{
  module: string;
  action: string;
}>): Array<PermissionGrant> {
  const uniquePermissions = new Map<string, PermissionGrant>();

  for (const permissionRow of input) {
    if (!isPermissionModule(permissionRow.module)) {
      continue;
    }

    if (!isPermissionAction(permissionRow.module, permissionRow.action)) {
      continue;
    }

    const permissionKey = `${permissionRow.module}:${permissionRow.action}`;
    uniquePermissions.set(permissionKey, {
      module: permissionRow.module,
      action: permissionRow.action,
    });
  }

  return Array.from(uniquePermissions.values()).sort(comparePermissionGrants);
}

export function toRoleSummary(roleSlug: RoleSlug, userCount?: number): RoleSummary {
  const roleDefinition = getRoleDefinition(roleSlug);

  return {
    slug: roleDefinition.slug,
    name: roleDefinition.name,
    description: roleDefinition.description,
    isSystem: roleDefinition.isSystem,
    hasFullAccess: roleDefinition.hasFullAccess,
    ...(userCount === undefined ? {} : { userCount }),
  };
}

export function toRoleSummaries(assignedRoleSlugs: Array<string>): Array<RoleSummary> {
  return assignedRoleSlugs
    .filter((assignedRoleSlug): assignedRoleSlug is RoleSlug => isRoleSlug(assignedRoleSlug))
    .map((assignedRoleSlug) => toRoleSummary(assignedRoleSlug));
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

export function isProtectedRoleSlug(slug: string): slug is RoleSlug {
  return protectedRoleSlugs.includes(slug as RoleSlug);
}

export function isProtectedSystemRoleSlug(slug: string): slug is SystemRoleSlug {
  return isProtectedRoleSlug(slug);
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
