import { UserRole } from '@workspace/constants';

export type User = {
  email: string;
  name: string;
  /** Optional — falls back to the SUPERADMIN_PASSWORD env var for SUPER_ADMIN users */
  password?: string;
  role: UserRole;
};

export const users: Array<User> = [
  {
    email: 'ronaldsalili1@gmail.com',
    name: 'Ronald Salili',
    role: UserRole.SUPER_ADMIN,
  },
];
