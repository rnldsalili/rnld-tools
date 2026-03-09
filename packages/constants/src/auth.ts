export enum UserRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const USER_ROLE_VALUES = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

export const USER_ROLES: Array<UserRole> = [...USER_ROLE_VALUES];
export const ADMIN_ROLES = USER_ROLES;
