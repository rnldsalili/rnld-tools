import {
  familyCreateSchema,
  familyIdParamSchema,
  familyListQuerySchema,
  familyUpdateSchema,
} from './families.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { replaceImageKeysWithPresignedUrls } from '@/api/lib/image-url-transformer';
import { getR2BucketName } from '@/api/lib/r2-presigner';
import { processImageUpload } from '@/api/lib/storage';
import { validate } from '@/api/lib/validator';


function isPrimaryContactUniqueViolation(
  error: Prisma.PrismaClientKnownRequestError,
): boolean {
  const target = error.meta?.target;
  if (typeof target === 'string') {
    return target.includes('primaryContactId');
  }

  if (Array.isArray(target)) {
    return target.some(
      (field): field is string =>
        typeof field === 'string' && field.includes('primaryContactId'),
    );
  }

  return false;
}

export const getFamilies = createHandlers(
  validate('query', familyListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skip = (page - 1) * limit;

    const where: Prisma.FamilyWhereInput = search
      ? {
        name: { contains: search },
      }
      : {};

    const [families, total] = await Promise.all([
      prisma.family.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              members: true,
            },
          },
          primaryContact: true,
        },
      }),
      prisma.family.count({ where }),
    ]);

    const familiesWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      families,
    );

    return c.json({
      meta: {
        code: 200,
        message: 'Families retrieved successfully',
      },
      data: {
        families: familiesWithPresignedImages,
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

export const getFamilyOptions = createHandlers(async (c) => {
  const prisma = initializePrisma(c.env);
  const families = await prisma.family.findMany({
    orderBy: [{ name: 'asc' }],
  });
  const familiesWithPresignedImages = await replaceImageKeysWithPresignedUrls(
    c.env,
    families,
  );

  return c.json({
    meta: {
      code: 200,
      message: 'Families retrieved successfully',
    },
    data: {
      families: familiesWithPresignedImages,
    },
  }, 200);
});

export const getFamily = createHandlers(
  validate('param', familyIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);
    const family = await prisma.family.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          include: {
            family: true,
          },
        },
      },
    });

    if (!family) {
      return c.json({
        meta: {
          code: 404,
          message: 'Family not found',
        },
        data: {},
      }, 404);
    }
    const familyWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      family,
    );

    return c.json({
      meta: {
        code: 200,
        message: 'Family retrieved successfully',
      },
      data: {
        family: familyWithPresignedImages,
      },
    }, 200);
  },
);

export const createFamily = createHandlers(
  validate('json', familyCreateSchema),
  async (c) => {
    const payload = c.req.valid('json');
    const user = c.get('user');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);
    const primaryContactId = payload.primaryContactId?.trim() || undefined;
    const address = payload.address?.trim();

    // Process image upload if provided
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: payload.image,
      destinationDir: 'families',
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
      const family = await prisma.family.create({
        data: {
          name: payload.name,
          image: imageResult.imageKey,
          address: address || null,
          ...(primaryContactId && {
            primaryContact: { connect: { id: primaryContactId } },
          }),
          createdByUser: { connect: { id: user.id } },
          updatedByUser: { connect: { id: user.id } },
        },
      });
      const familyWithPresignedImages = await replaceImageKeysWithPresignedUrls(
        c.env,
        family,
      );

      return c.json({
        meta: {
          code: 201,
          message: 'Family created successfully',
        },
        data: {
          family: familyWithPresignedImages,
        },
      }, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          if (isPrimaryContactUniqueViolation(error)) {
            return c.json({
              meta: {
                code: 409,
                message: 'The selected member is already assigned as a primary contact',
              },
              data: {},
            }, 409);
          }

          return c.json({
            meta: {
              code: 409,
              message: 'A family with this name already exists',
            },
            data: {},
          }, 409);
        }
        if (
          (error.code === 'P2003' || error.code === 'P2025')
          && primaryContactId
        ) {
          return c.json({
            meta: {
              code: 400,
              message: 'Primary contact not found',
            },
            data: {},
          }, 400);
        }
      }
      throw error;
    }
  },
);

export const updateFamily = createHandlers(
  validate('param', familyIdParamSchema),
  validate('json', familyUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const payload = c.req.valid('json');
    const user = c.get('user');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);
    const primaryContactId = payload.primaryContactId?.trim();
    const address = payload.address?.trim();

    // Get existing family first to check for old image
    const existingFamily = await prisma.family.findUnique({
      where: { id },
      select: { image: true },
    });

    if (!existingFamily) {
      return c.json({
        meta: {
          code: 404,
          message: 'Family not found',
        },
        data: {},
      }, 404);
    }

    // Process image upload/update
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: payload.image,
      destinationDir: 'families',
      existingImageKey: existingFamily.image,
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
      const family = await prisma.family.update({
        where: { id },
        data: {
          name: payload.name,
          ...(imageResult.imageKey !== undefined && { image: imageResult.imageKey }),
          ...(payload.address !== undefined && { address: address || null }),
          ...(payload.primaryContactId !== undefined
            && (primaryContactId
              ? { primaryContact: { connect: { id: primaryContactId } } }
              : { primaryContact: { disconnect: true } })),
          updatedByUser: { connect: { id: user.id } },
        },
      });
      const familyWithPresignedImages = await replaceImageKeysWithPresignedUrls(
        c.env,
        family,
      );

      return c.json({
        meta: {
          code: 200,
          message: 'Family updated successfully',
        },
        data: {
          family: familyWithPresignedImages,
        },
      }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          if (isPrimaryContactUniqueViolation(error)) {
            return c.json({
              meta: {
                code: 409,
                message: 'The selected member is already assigned as a primary contact',
              },
              data: {},
            }, 409);
          }

          return c.json({
            meta: {
              code: 409,
              message: 'A family with this name already exists',
            },
            data: {},
          }, 409);
        }
        if (
          (error.code === 'P2003' || error.code === 'P2025')
          && payload.primaryContactId !== undefined
          && primaryContactId
        ) {
          return c.json({
            meta: {
              code: 400,
              message: 'Primary contact not found',
            },
            data: {},
          }, 400);
        }
        if (error.code === 'P2025') {
          return c.json({
            meta: {
              code: 404,
              message: 'Family not found',
            },
            data: {},
          }, 404);
        }
      }
      throw error;
    }
  },
);
