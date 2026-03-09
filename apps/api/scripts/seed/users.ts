import { UserRole } from '@workspace/constants';

export type User = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

export const users: Array<User> = [
  {
    email: 'ronaldsalili1@gmail.com',
    name: 'Ronald Salili',
    password: 'Test@123',
    role: UserRole.SUPER_ADMIN,
  },
];
