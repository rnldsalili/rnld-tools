import { PermissionAction, PermissionModule, RoleSlug } from './types';

import type { RoleDefinition } from './types';

export const permissionCatalog = {
  [PermissionModule.DASHBOARD]: {
    label: 'Dashboard',
    actions: {
      [PermissionAction.VIEW]: 'View',
    },
  },
  [PermissionModule.CLIENTS]: {
    label: 'Clients',
    actions: {
      [PermissionAction.VIEW]: 'View',
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.UPDATE]: 'Update',
    },
  },
  [PermissionModule.LOANS]: {
    label: 'Loans',
    actions: {
      [PermissionAction.VIEW]: 'View',
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.UPDATE]: 'Update',
      [PermissionAction.DELETE]: 'Delete',
    },
  },
  [PermissionModule.DOCUMENTS]: {
    label: 'Documents',
    actions: {
      [PermissionAction.VIEW]: 'View',
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.UPDATE]: 'Update',
      [PermissionAction.DELETE]: 'Delete',
    },
  },
  [PermissionModule.NOTIFICATIONS]: {
    label: 'Notifications',
    actions: {
      [PermissionAction.VIEW]: 'View',
      [PermissionAction.MANAGE]: 'Manage',
    },
  },
  [PermissionModule.ROLES]: {
    label: 'Roles',
    actions: {
      [PermissionAction.VIEW]: 'View',
    },
  },
  [PermissionModule.USERS]: {
    label: 'Users',
    actions: {
      [PermissionAction.VIEW]: 'View',
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.ASSIGN_ROLES]: 'Assign Roles',
    },
  },
} as const satisfies Record<PermissionModule, {
  label: string;
  actions: Partial<Record<PermissionAction, string>>;
}>;

export const roleCatalog = {
  [RoleSlug.SUPER_ADMIN]: {
    slug: RoleSlug.SUPER_ADMIN,
    name: 'Super Admin',
    description: 'Protected role with full access.',
    isSystem: true,
    hasFullAccess: true,
  },
  [RoleSlug.ADMIN]: {
    slug: RoleSlug.ADMIN,
    name: 'Admin',
    description: 'Default administrator role.',
    isSystem: true,
    hasFullAccess: false,
  },
} as const satisfies Record<RoleSlug, RoleDefinition>;

export const protectedRoleSlugs: Array<RoleSlug> = [RoleSlug.SUPER_ADMIN];
export const protectedSystemRoleSlugs = protectedRoleSlugs;
