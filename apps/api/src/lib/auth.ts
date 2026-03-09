import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';


import { USER_ROLES, UserRole } from '@workspace/constants';

import type { BetterAuthOptions } from 'better-auth';
import { initializePrisma } from '@/api/lib/db';

// Base configuration for better-auth
export const authConfig = {
  database: {
    provider: 'sqlite' as const,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: USER_ROLES,
        required: false,
        defaultValue: UserRole.ADMIN,
        input: false,
      },
    },
  },
} satisfies BetterAuthOptions;

/**
 * Better Auth Instance
 */
export const auth = (env: CloudflareBindings) => {
  const prisma = initializePrisma(env);
  return betterAuth({
    ...authConfig,
    database: prismaAdapter(prisma, authConfig.database),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });
};
