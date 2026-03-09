import { ADMIN_ROLES, UserRole } from '@workspace/constants';
import {
  adminCreateSchema,
  adminIdParamSchema,
  adminListQuerySchema,
  adminPasswordUpdateSchema,
  adminUpdateSchema,
} from './admins.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { auth } from '@/api/lib/auth';
import { initializePrisma } from '@/api/lib/db';
import { replaceImageKeysWithPresignedUrls } from '@/api/lib/image-url-transformer';
import { getR2BucketName } from '@/api/lib/r2-presigner';
import { processImageUpload } from '@/api/lib/storage';
import { validate } from '@/api/lib/validator';


export const getAdmins = createHandlers(
  validate('query', adminListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: { in: ADMIN_ROLES },
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [admins, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
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
      }),
      prisma.user.count({ where }),
    ]);
    const adminsWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      admins,
    );

    return c.json({
      meta: {
        code: 200,
        message: 'Admins retrieved successfully',
      },
      data: {
        admins: adminsWithPresignedImages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    }, 200);
  },
);

export const getAdmin = createHandlers(
  validate('param', adminIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const admin = await prisma.user.findUnique({
      where: { id },
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

    if (!admin) {
      return c.json({
        meta: {
          code: 404,
          message: 'Admin not found',
        },
        data: {},
      }, 404);
    }

    if (!ADMIN_ROLES.includes(admin.role as (typeof ADMIN_ROLES)[number])) {
      return c.json({
        meta: {
          code: 404,
          message: 'Admin not found',
        },
        data: {},
      }, 404);
    }
    const adminWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      admin,
    );

    return c.json({
      meta: {
        code: 200,
        message: 'Admin retrieved successfully',
      },
      data: {
        admin: adminWithPresignedImages,
      },
    }, 200);
  },
);

export const createAdmin = createHandlers(
  validate('json', adminCreateSchema),
  async (c) => {
    const payload = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);
    const authContext = await auth(c.env).$context;

    // Process image upload if provided
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: payload.image,
      destinationDir: 'admins',
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

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (existingUser) {
      return c.json({
        meta: {
          code: 409,
          message: 'User with this email already exists',
        },
        data: {},
      }, 409);
    }

    const hashedPassword = await authContext.password.hash(payload.password);

    const admin = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: payload.email.toLowerCase(),
        name: payload.name,
        image: imageResult.imageKey,
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    });
    const adminWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      admin,
    );

    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        accountId: admin.id,
        providerId: 'credential',
        password: hashedPassword,
      },
    });

    return c.json({
      meta: {
        code: 201,
        message: 'Admin created successfully',
      },
      data: {
        admin: adminWithPresignedImages,
      },
    }, 201);
  },
);

export const updateAdmin = createHandlers(
  validate('param', adminIdParamSchema),
  validate('json', adminUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { image, ...payload } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);

    // Get existing admin to check for old image
    const existingAdmin = await prisma.user.findUnique({
      where: { id },
      select: { image: true },
    });

    if (!existingAdmin) {
      return c.json({
        meta: {
          code: 404,
          message: 'Admin not found',
        },
        data: {},
      }, 404);
    }

    // Process image upload/update
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: image,
      destinationDir: 'admins',
      existingImageKey: existingAdmin.image,
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
      const admin = await prisma.user.update({
        where: { id },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.email && { email: payload.email.toLowerCase() }),
          ...(imageResult.imageKey !== undefined && { image: imageResult.imageKey }),
        },
      });
      const adminWithPresignedImages = await replaceImageKeysWithPresignedUrls(
        c.env,
        admin,
      );

      return c.json({
        meta: {
          code: 200,
          message: 'Admin updated successfully',
        },
        data: {
          admin: adminWithPresignedImages,
        },
      }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return c.json({
            meta: {
              code: 404,
              message: 'Admin not found',
            },
            data: {},
          }, 404);
        }
        if (error.code === 'P2002') {
          return c.json({
            meta: {
              code: 409,
              message: 'User with this email already exists',
            },
            data: {},
          }, 409);
        }
      }
      throw error;
    }
  },
);

export const updateAdminPassword = createHandlers(
  validate('param', adminIdParamSchema),
  validate('json', adminPasswordUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { password } = c.req.valid('json');
    const prisma = initializePrisma(c.env);
    const authContext = await auth(c.env).$context;

    const admin = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!admin || !ADMIN_ROLES.includes(admin.role as (typeof ADMIN_ROLES)[number])) {
      return c.json({
        meta: {
          code: 404,
          message: 'Admin not found',
        },
        data: {},
      }, 404);
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: id,
        providerId: 'credential',
      },
      select: { id: true },
    });

    if (!account) {
      return c.json({
        meta: {
          code: 404,
          message: 'Admin credentials not found',
        },
        data: {},
      }, 404);
    }

    const hashedPassword = await authContext.password.hash(password);

    try {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });

      return c.json({
        meta: {
          code: 200,
          message: 'Admin password updated successfully',
        },
        data: {},
      }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return c.json({
            meta: {
              code: 404,
              message: 'Admin credentials not found',
            },
            data: {},
          }, 404);
        }
      }
      throw error;
    }
  },
);
