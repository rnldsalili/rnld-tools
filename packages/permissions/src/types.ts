export enum PermissionModule {
  CLIENTS = 'clients',
  LOANS = 'loans',
  DOCUMENTS = 'documents',
  NOTIFICATIONS = 'notifications',
  ROLES = 'roles',
  USERS = 'users',
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  ASSIGN_ROLES = 'assign-roles',
}

export enum SystemRoleSlug {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
}

export type PermissionGrant = {
  module: PermissionModule;
  action: PermissionAction;
};

export type GroupedPermissionGrant = {
  module: PermissionModule;
  actions: Array<PermissionAction>;
};

export type RoleSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount?: number;
};

export type AuthorizationSnapshot = {
  roles: Array<RoleSummary>;
  permissions: Array<PermissionGrant>;
  hasSuperAdminRole: boolean;
};
