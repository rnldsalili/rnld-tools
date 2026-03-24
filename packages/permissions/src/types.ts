export enum PermissionModule {
  DASHBOARD = 'dashboard',
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

export enum RoleSlug {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
}

export enum SystemRoleSlug {
  SUPER_ADMIN = RoleSlug.SUPER_ADMIN,
  ADMIN = RoleSlug.ADMIN,
}

export type PermissionGrant = {
  module: PermissionModule;
  action: PermissionAction;
};

export type GroupedPermissionGrant = {
  module: PermissionModule;
  actions: Array<PermissionAction>;
};

export type RoleDefinition = {
  slug: RoleSlug;
  name: string;
  description: string | null;
  isSystem: boolean;
  hasFullAccess: boolean;
};

export type RoleSummary = {
  slug: RoleSlug;
  name: string;
  description: string | null;
  isSystem: boolean;
  hasFullAccess: boolean;
  userCount?: number;
};

export type AuthorizationSnapshot = {
  roles: Array<RoleSummary>;
  permissions: Array<PermissionGrant>;
  hasSuperAdminRole: boolean;
};
