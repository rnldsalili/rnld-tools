import { SystemRoleSlug } from '@workspace/permissions';

export type User = {
  email: string;
  name: string;
  /** Optional — falls back to the SUPERADMIN_PASSWORD env var for SUPER_ADMIN users */
  password?: string;
  roles: Array<string>;
};

export const users: Array<User> = [
  {
    email: 'ronaldsalili1@gmail.com',
    name: 'Ronald Salili',
    roles: [SystemRoleSlug.SUPER_ADMIN],
  },
];
