import { SystemRoleSlug, isRoleSlug } from '@workspace/permissions';
import { users } from '../../../scripts/seed/users';
import { seedRequestSchema } from './seed.schema';
import { createHandlers } from '@/api/app';
import { auth } from '@/api/lib/auth';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';

const resolvePassword = (
  userData: (typeof users)[number],
  env: CloudflareBindings,
): string | null => {
  if (userData.password) return userData.password;
  if (userData.roles.includes(SystemRoleSlug.SUPER_ADMIN)) return env.SUPERADMIN_PASSWORD || null;
  return null;
};

export const seedDatabase = createHandlers(
  validate('json', seedRequestSchema),
  async (c) => {
    const { seedToken } = c.req.valid('json');
    const envSeedToken = c.env.SEED_TOKEN;

    if (seedToken !== envSeedToken) {
      return c.json({
        meta: {
          code: 403,
          message: 'Invalid seed token',
        },
      }, 403);
    }

    const prisma = initializePrisma(c.env);
    const authContext = await auth(c.env).$context;

    let created = 0;
    let skipped = 0;

    for (const userData of users) {
      const normalizedEmail = userData.email.toLowerCase().trim();

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        await syncUserRoles({
          prisma,
          roleSlugs: userData.roles,
          userId: existingUser.id,
        });
        skipped += 1;
        continue;
      }

      const password = resolvePassword(userData, c.env);

      if (!password) {
        return c.json({
          meta: {
            code: 500,
            message: `Password not configured for user: ${normalizedEmail}`,
          },
        }, 500);
      }

      const hashedPassword = await authContext.password.hash(password);

      const createdUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          name: userData.name,
          emailVerified: true,
        },
      });

      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: createdUser.id,
          accountId: createdUser.id,
          providerId: 'credential',
          password: hashedPassword,
        },
      });

      await syncUserRoles({
        prisma,
        roleSlugs: userData.roles,
        userId: createdUser.id,
      });

      created += 1;
    }

    return c.json({
      meta: {
        code: 201,
        message: 'Database seeded successfully',
      },
      data: {
        created,
        skipped,
      },
    }, 201);
  },
);

async function syncUserRoles({
  prisma,
  userId,
  roleSlugs,
}: {
  prisma: ReturnType<typeof initializePrisma>;
  userId: string;
  roleSlugs: Array<string>;
}) {
  const normalizedRoleSlugs = roleSlugs.map((roleSlug) => {
    if (!isRoleSlug(roleSlug)) {
      throw new Error(`Seed role not found: ${roleSlug}`);
    }

    return roleSlug;
  });

  const existingUserRoles = await prisma.userRole.findMany({
    where: { userId },
  });

  const existingRoleSlugs = new Set(existingUserRoles.map((userRole) => userRole.roleSlug));

  for (const roleSlug of normalizedRoleSlugs) {
    if (!existingRoleSlugs.has(roleSlug)) {
      await prisma.userRole.create({
        data: {
          userId,
          roleSlug,
        },
      });
    }
  }
}
