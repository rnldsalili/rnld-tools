import {
  accountPasswordUpdateSchema,
  accountUpdateSchema,
} from './account.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { auth } from '@/api/lib/auth';
import { replaceImageKeysWithPresignedUrls } from '@/api/lib/image-url-transformer';
import { getR2BucketName } from '@/api/lib/r2-presigner';
import { processImageUpload } from '@/api/lib/storage';
import { validate } from '@/api/lib/validator';


export const getAccount = createHandlers(async (c) => {
  const user = c.get('user');
  const prisma = initializePrisma(c.env);

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!account) {
    return c.json({
      meta: {
        code: 404,
        message: 'Account not found',
      },
      data: {},
    }, 404);
  }
  const accountWithPresignedImages = await replaceImageKeysWithPresignedUrls(
    c.env,
    account,
  );

  return c.json({
    meta: {
      code: 200,
      message: 'Account retrieved successfully',
    },
    data: {
      account: accountWithPresignedImages,
    },
  }, 200);
});

export const updateAccount = createHandlers(
  validate('json', accountUpdateSchema),
  async (c) => {
    const { image, ...payload } = c.req.valid('json');
    const user = c.get('user');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, image: true },
    });

    if (!account) {
      return c.json({
        meta: {
          code: 404,
          message: 'Account not found',
        },
        data: {},
      }, 404);
    }
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: image,
      destinationDir: 'admins',
      existingImageKey: account.image,
      bucketName,
    });

    if (imageResult.error) {
      return c.json({
        meta: {
          code: imageResult.error.code,
          message: imageResult.error.message,
        },
        data: {},
      }, imageResult.error.code as 404 | 500);
    }

    try {
      const updatedAccount = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          ...(imageResult.imageKey !== undefined && { image: imageResult.imageKey }),
        },
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      const accountWithPresignedImages = await replaceImageKeysWithPresignedUrls(
        c.env,
        updatedAccount,
      );

      return c.json({
        meta: {
          code: 200,
          message: 'Account updated successfully',
        },
        data: {
          account: accountWithPresignedImages,
        },
      }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return c.json({
            meta: {
              code: 404,
              message: 'Account not found',
            },
            data: {},
          }, 404);
        }
      }
      throw error;
    }
  },
);

export const updateAccountPassword = createHandlers(
  validate('json', accountPasswordUpdateSchema),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid('json');
    const user = c.get('user');
    const prisma = initializePrisma(c.env);
    const authContext = await auth(c.env).$context;

    const accountUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    });

  if (!accountUser) {
      return c.json({
        meta: {
          code: 404,
          message: 'Account not found',
        },
        data: {},
      }, 404);
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
      select: { id: true, password: true },
    });

    if (!account || !account.password) {
      return c.json({
        meta: {
          code: 404,
          message: 'Account credentials not found',
        },
        data: {},
      }, 404);
    }

    const isValidPassword = await authContext.password.verify({
      password: currentPassword,
      hash: account.password,
    });

    if (!isValidPassword) {
      return c.json({
        meta: {
          code: 400,
          message: 'Current password is incorrect',
        },
        data: {},
      }, 400);
    }

    const hashedPassword = await authContext.password.hash(newPassword);

    try {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });

      return c.json({
        meta: {
          code: 200,
          message: 'Password updated successfully',
        },
        data: {},
      }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return c.json({
            meta: {
              code: 404,
              message: 'Account credentials not found',
            },
            data: {},
          }, 404);
        }
      }
      throw error;
    }
  },
);
