import {
  NotificationChannel,
  NotificationEvent,
} from '@workspace/constants';
import {
  RoleSlug,
  toPermissionGrants,
  toRoleSummaries,
} from '@workspace/permissions';
import {
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userRolesUpdateSchema,
  usersListQuerySchema,
} from './users.schema';
import type { NotificationEmailProvider } from '@workspace/constants';
import type { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { auth } from '@/api/lib/auth';
import { initializePrisma } from '@/api/lib/db';
import { getEmailProviderStatus } from '@/api/lib/notifications/config';
import {
  createNotificationLog,
  markNotificationLogQueueFailed,
} from '@/api/lib/notifications/logs';
import { enqueueEmailNotificationJob } from '@/api/lib/notifications/queue';
import {
  getNotificationContentFormat,
  parseNotificationTemplateContent,
  renderEmailTemplate,
} from '@/api/lib/notifications/renderer';
import { getNotificationSiteUrl } from '@/api/lib/notifications/placeholders';
import { generateTemporaryPassword } from '@/api/lib/password';
import { validate } from '@/api/lib/validator';

const CREDENTIAL_PROVIDER_ID = 'credential';

async function syncUserRoles(
  prisma: ReturnType<typeof initializePrisma>,
  userId: string,
  existingRoleSlugs: Set<string>,
  nextRoleSlugs: Array<string>,
) {
  await prisma.userRole.deleteMany({
    where: {
      userId,
      ...(nextRoleSlugs.length > 0
        ? {
          roleSlug: {
            notIn: nextRoleSlugs,
          },
        }
        : {}),
    },
  });

  for (const roleSlug of nextRoleSlugs) {
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

export const getCurrentUser = createHandlers(
  async (c) => {
    const prisma = initializePrisma(c.env);
    const currentUserId = c.get('user').id;

    const userFound = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        userRoles: {
          select: {
            roleSlug: true,
          },
        },
      },
    });

    if (!userFound) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    const assignedRoleSlugs = userFound.userRoles.map((userRole) => userRole.roleSlug);
    const rolePermissions = assignedRoleSlugs.length > 0
      ? await prisma.rolePermission.findMany({
        where: {
          roleSlug: {
            in: assignedRoleSlugs,
          },
        },
        select: {
          module: true,
          action: true,
        },
      })
      : [];

    return c.json({
      meta: { code: 200, message: 'Current user retrieved successfully' },
      data: {
        user: {
          id: userFound.id,
          name: userFound.name,
          email: userFound.email,
          emailVerified: userFound.emailVerified,
          mustChangePassword: userFound.mustChangePassword,
          image: userFound.image,
          createdAt: userFound.createdAt,
          updatedAt: userFound.updatedAt,
        },
        roles: toRoleSummaries(assignedRoleSlugs),
        permissions: toPermissionGrants(rolePermissions),
      },
    }, 200);
  },
);

export const getUsers = createHandlers(
  validate('query', usersListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);
    const skipCount = (page - 1) * limit;
    const normalizedSearch = search?.trim();
    const userFilter: Prisma.UserWhereInput = normalizedSearch
      ? {
        OR: [
          { name: { contains: normalizedSearch } },
          { email: { contains: normalizedSearch } },
        ],
      }
      : {};

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take: limit,
        include: {
          userRoles: {
            select: {
              roleSlug: true,
            },
          },
        },
      }),
      prisma.user.count({ where: userFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Users retrieved successfully' },
      data: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          mustChangePassword: user.mustChangePassword,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles: toRoleSummaries(user.userRoles.map((userRole) => userRole.roleSlug)),
        })),
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
        },
      },
    }, 200);
  },
);

export const createUser = createHandlers(
  validate('json', createUserSchema),
  async (c) => {
    const authenticatedUser = c.get('user');
    const { name, email, roleSlugs } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const normalizedEmail = email.trim().toLowerCase();
    const uniqueRoleSlugs = Array.from(new Set(roleSlugs));

    const [existingUser, notificationEventConfig] = await Promise.all([
      prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      }),
      prisma.notificationEventConfig.findFirst({
        where: {
          event: NotificationEvent.USER_ACCOUNT_CREATED,
          channel: NotificationChannel.EMAIL,
          isEnabled: true,
        },
        include: {
          template: true,
        },
      }),
    ]);

    if (existingUser) {
      return c.json({ meta: { code: 409, message: 'A user with this email already exists' } }, 409);
    }

    if (
      !authenticatedUser.hasSuperAdminRole
      && uniqueRoleSlugs.includes(RoleSlug.SUPER_ADMIN)
    ) {
      return c.json({
        meta: {
          code: 403,
          message: 'Only super admins can create a super admin user.',
        },
      }, 403);
    }

    if (
      !notificationEventConfig
      || notificationEventConfig.channel !== NotificationChannel.EMAIL
      || !notificationEventConfig.emailProvider
    ) {
      return c.json({
        meta: {
          code: 409,
          message: 'User account creation email is not configured.',
        },
      }, 409);
    }

    const notificationEmailProvider = notificationEventConfig.emailProvider as NotificationEmailProvider;
    const providerStatus = getEmailProviderStatus(c.env)[notificationEmailProvider];

    if (!providerStatus.configured) {
      return c.json({
        meta: {
          code: 409,
          message: 'The configured email provider for user invitations is unavailable.',
        },
      }, 409);
    }

    const temporaryPassword = generateTemporaryPassword();
    const authContext = await auth(c.env).$context;
    const hashedPassword = await authContext.password.hash(temporaryPassword);

    let createdUserId: string | null = null;
    let notificationLogId: string | null = null;

    try {
      const userId = crypto.randomUUID();
      const trimmedName = name.trim();

      await prisma.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          name: trimmedName,
          emailVerified: true,
          mustChangePassword: true,
        },
      });

      createdUserId = userId;

      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          accountId: userId,
          providerId: CREDENTIAL_PROVIDER_ID,
          password: hashedPassword,
        },
      });

      await syncUserRoles(prisma, userId, new Set<string>(), uniqueRoleSlugs);

      const createdUser = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          userRoles: {
            select: {
              roleSlug: true,
            },
          },
        },
      });

      const renderedEmail = renderEmailTemplate({
        event: NotificationEvent.USER_ACCOUNT_CREATED,
        subject: notificationEventConfig.template.subject ?? notificationEventConfig.template.name,
        content: parseNotificationTemplateContent(
          getNotificationContentFormat(notificationEventConfig.template.contentFormat),
          notificationEventConfig.template.content,
        ),
        siteUrl: getNotificationSiteUrl(c.env),
        context: {
          client: {
            name: '',
            email: '',
            phone: '',
          },
          loan: {
            id: '',
            amount: 0,
            excessBalance: 0,
            currency: 'PHP',
            description: '',
            loanDate: new Date().toISOString(),
            installmentCount: 0,
          },
          installment: {
            number: null,
            amount: 0,
            dueDate: new Date().toISOString(),
            paidAt: new Date().toISOString(),
          },
          user: {
            name: createdUser.name,
            email: createdUser.email,
            temporaryPassword,
          },
        },
      });

      const notificationLog = await createNotificationLog(c.env, {
        channel: NotificationChannel.EMAIL,
        event: NotificationEvent.USER_ACCOUNT_CREATED,
        provider: notificationEmailProvider,
        recipientEmail: createdUser.email,
        recipientName: createdUser.name,
        subject: renderedEmail.subject,
        messageContent: renderedEmail.html,
        queuedAt: new Date().toISOString(),
        queuedByUserId: authenticatedUser.id,
        isTestSend: false,
      });

      notificationLogId = notificationLog.id;

      await enqueueEmailNotificationJob(c.env, {
        notificationLogId: notificationLog.id,
        channel: NotificationChannel.EMAIL,
        provider: notificationEmailProvider,
        recipient: {
          email: createdUser.email,
          name: createdUser.name,
        },
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        trace: {
          event: NotificationEvent.USER_ACCOUNT_CREATED,
          queuedAt: notificationLog.queuedAt.toISOString(),
          queuedByUserId: authenticatedUser.id,
          testSend: false,
        },
      });

      return c.json({
        meta: { code: 201, message: 'User created successfully' },
        data: {
          user: {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            emailVerified: createdUser.emailVerified,
            mustChangePassword: createdUser.mustChangePassword,
            image: createdUser.image,
            createdAt: createdUser.createdAt,
            updatedAt: createdUser.updatedAt,
            roles: toRoleSummaries(createdUser.userRoles.map((userRole) => userRole.roleSlug)),
          },
        },
      }, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user.';

      if (notificationLogId) {
        await markNotificationLogQueueFailed(c.env, {
          notificationLogId,
          errorMessage,
        });
      }

      if (createdUserId) {
        await prisma.user.delete({
          where: { id: createdUserId },
        }).catch(() => undefined);
      }

      return c.json({
        meta: {
          code: 500,
          message: errorMessage,
        },
      }, 500);
    }
  },
);

export const updateUserRoles = createHandlers(
  validate('param', userIdParamSchema),
  validate('json', userRolesUpdateSchema),
  async (c) => {
    const authenticatedUser = c.get('user');
    const { id } = c.req.valid('param');
    const { roleSlugs } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const uniqueRoleSlugs = Array.from(new Set(roleSlugs));

    const userFound = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          select: {
            roleSlug: true,
          },
        },
      },
    });

    if (!userFound) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    const existingHasSuperAdminRole = userFound.userRoles.some((userRole) => (
      userRole.roleSlug === RoleSlug.SUPER_ADMIN
    ));
    const nextHasSuperAdminRole = uniqueRoleSlugs.includes(RoleSlug.SUPER_ADMIN);

    if (
      !authenticatedUser.hasSuperAdminRole
      && (existingHasSuperAdminRole || nextHasSuperAdminRole)
    ) {
      return c.json({
        meta: {
          code: 403,
          message: 'Only super admins can manage super admin assignments.',
        },
      }, 403);
    }

    const existingRoleSlugs = new Set(userFound.userRoles.map((userRole) => userRole.roleSlug));

    await syncUserRoles(prisma, id, existingRoleSlugs, uniqueRoleSlugs);

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          select: {
            roleSlug: true,
          },
        },
      },
    });

    if (!updatedUser) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'User roles updated successfully' },
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          image: updatedUser.image,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          roles: toRoleSummaries(updatedUser.userRoles.map((userRole) => userRole.roleSlug)),
        },
      },
    }, 200);
  },
);

export const updateUser = createHandlers(
  validate('param', userIdParamSchema),
  validate('json', updateUserSchema),
  async (c) => {
    const authenticatedUser = c.get('user');
    const { id } = c.req.valid('param');
    const { name, roleSlugs } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const uniqueRoleSlugs = Array.from(new Set(roleSlugs));

    const userFound = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          select: {
            roleSlug: true,
          },
        },
      },
    });

    if (!userFound) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    const existingHasSuperAdminRole = userFound.userRoles.some((userRole) => (
      userRole.roleSlug === RoleSlug.SUPER_ADMIN
    ));
    const nextHasSuperAdminRole = uniqueRoleSlugs.includes(RoleSlug.SUPER_ADMIN);

    if (
      !authenticatedUser.hasSuperAdminRole
      && (existingHasSuperAdminRole || nextHasSuperAdminRole)
    ) {
      return c.json({
        meta: {
          code: 403,
          message: 'Only super admins can manage super admin assignments.',
        },
      }, 403);
    }

    const existingRoleSlugs = new Set(userFound.userRoles.map((userRole) => userRole.roleSlug));

    await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    await syncUserRoles(prisma, id, existingRoleSlugs, uniqueRoleSlugs);

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          select: {
            roleSlug: true,
          },
        },
      },
    });

    if (!updatedUser) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'User updated successfully' },
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          image: updatedUser.image,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          roles: toRoleSummaries(updatedUser.userRoles.map((userRole) => userRole.roleSlug)),
        },
      },
    }, 200);
  },
);

export const changeMyPassword = createHandlers(
  validate('json', changePasswordSchema),
  async (c) => {
    const authenticatedUser = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const authContext = await auth(c.env).$context;
    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: authenticatedUser.id,
        providerId: CREDENTIAL_PROVIDER_ID,
      },
    });

    if (!credentialAccount?.password) {
      return c.json({
        meta: {
          code: 400,
          message: 'Credential account not found.',
        },
      }, 400);
    }

    if (newPassword.length < authContext.password.config.minPasswordLength) {
      return c.json({
        meta: {
          code: 400,
          message: `Password must be at least ${authContext.password.config.minPasswordLength} characters long.`,
        },
      }, 400);
    }

    if (newPassword.length > authContext.password.config.maxPasswordLength) {
      return c.json({
        meta: {
          code: 400,
          message: `Password must be at most ${authContext.password.config.maxPasswordLength} characters long.`,
        },
      }, 400);
    }

    const isCurrentPasswordValid = await authContext.password.verify({
      hash: credentialAccount.password,
      password: currentPassword,
    });

    if (!isCurrentPasswordValid) {
      return c.json({
        meta: {
          code: 400,
          message: 'Current password is incorrect.',
        },
      }, 400);
    }

    const hashedPassword = await authContext.password.hash(newPassword);

    await Promise.all([
      prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: hashedPassword },
      }),
      prisma.user.update({
        where: { id: authenticatedUser.id },
        data: { mustChangePassword: false },
      }),
    ]);

    return c.json({
      meta: {
        code: 200,
        message: 'Password updated successfully.',
      },
    }, 200);
  },
);
