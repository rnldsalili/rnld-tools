import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';

import type { BetterAuthOptions } from 'better-auth';
import type { NotificationEnv } from '@/api/lib/notifications/types';
import { sendForgotPasswordOtpEmail } from '@/api/lib/auth-email';
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
} satisfies BetterAuthOptions;

/**
 * Better Auth Instance
 */
export const auth = (env: NotificationEnv) => {
  const prisma = initializePrisma(env);
  return betterAuth({
    ...authConfig,
    emailAndPassword: {
      ...authConfig.emailAndPassword,
      onPasswordReset: async ({ user }) => {
        await prisma.user.updateMany({
          where: { id: user.id },
          data: { mustChangePassword: false },
        });
      },
    },
    database: prismaAdapter(prisma, authConfig.database),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== 'forget-password') {
            throw new Error(`Unsupported email OTP type: ${type}`);
          }

          await sendForgotPasswordOtpEmail(env, {
            email,
            otp,
          });
        },
      }),
    ],
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    rateLimit: {
      enabled: true,
    },
  });
};
