import { PermissionAction, PermissionModule, SystemRoleSlug } from './types';

export const permissionCatalog = {
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
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.UPDATE]: 'Update',
      [PermissionAction.DELETE]: 'Delete',
    },
  },
  [PermissionModule.USERS]: {
    label: 'Users',
    actions: {
      [PermissionAction.VIEW]: 'View',
      [PermissionAction.ASSIGN_ROLES]: 'Assign Roles',
    },
  },
} as const satisfies Record<PermissionModule, {
  label: string;
  actions: Partial<Record<PermissionAction, string>>;
}>;

export const protectedSystemRoleSlugs: Array<SystemRoleSlug> = [SystemRoleSlug.SUPER_ADMIN];
