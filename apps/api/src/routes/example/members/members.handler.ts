import {
  memberCreateSchema,
  memberIdParamSchema,
  memberListQuerySchema,
  memberUpdateSchema,
} from './members.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { replaceImageKeysWithPresignedUrls } from '@/api/lib/image-url-transformer';
import { getR2BucketName } from '@/api/lib/r2-presigner';
import { processImageUpload } from '@/api/lib/storage';
import { validate } from '@/api/lib/validator';


export const getMembers = createHandlers(
  validate('query', memberListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = search
      ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { middleName: { contains: search } },
        ],
      }
      : {};

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          family: true,
        },
        skip,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);
    const membersWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      members,
    );

    return c.json({
      meta: {
        code: 200,
        message: 'Members retrieved successfully',
      },
      data: {
        members: membersWithPresignedImages,
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

export const getMemberOptions = createHandlers(async (c) => {
  const prisma = initializePrisma(c.env);
  const members = await prisma.member.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  const membersWithPresignedImages = await replaceImageKeysWithPresignedUrls(
    c.env,
    members,
  );

  return c.json({
    meta: {
      code: 200,
      message: 'Members retrieved successfully',
    },
    data: {
      members: membersWithPresignedImages,
    },
  }, 200);
});

export const getMember = createHandlers(
  validate('param', memberIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        family: true,
      },
    });

    if (!member) {
      return c.json({
        meta: {
          code: 404,
          message: 'Member not found',
        },
        data: {},
      }, 404);
    }
    const memberWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      member,
    );

    return c.json({
      meta: {
        code: 200,
        message: 'Member retrieved successfully',
      },
      data: {
        member: memberWithPresignedImages,
      },
    }, 200);
  },
);

export const createMember = createHandlers(
  validate('json', memberCreateSchema),
  async (c) => {
    const payload = c.req.valid('json');
    const user = c.get('user');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);

    // Process image upload if provided
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: payload.image,
      destinationDir: 'members',
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
      const member = await prisma.member.create({
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          middleName: payload.middleName || undefined,
          suffix: payload.suffix || undefined,
          gender: payload.gender,
          status: payload.status ?? 'ACTIVE',
          dateOfBirth: payload.dateOfBirth
            ? new Date(payload.dateOfBirth)
            : undefined,
          image: imageResult.imageKey,
          family: payload.familyId ? { connect: { id: payload.familyId } } : undefined,
          createdByUser: { connect: { id: user.id } },
          updatedByUser: { connect: { id: user.id } },
        },
      });
      const memberWithPresignedImages = await replaceImageKeysWithPresignedUrls(
        c.env,
        member,
      );

      return c.json({
        meta: {
          code: 201,
          message: 'Member created successfully',
        },
        data: {
          member: memberWithPresignedImages,
        },
      }, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return c.json({
            meta: {
              code: 409,
              message: 'A member with this name already exists',
            },
            data: {},
          }, 409);
        }
        if (error.code === 'P2003') {
          return c.json({
            meta: {
              code: 400,
              message: 'Family not found',
            },
            data: {},
          }, 400);
        }
      }
      throw error;
    }
  },
);

export const updateMember = createHandlers(
  validate('param', memberIdParamSchema),
  validate('json', memberUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { familyId, image, ...payload } = c.req.valid('json');
    const user = c.get('user');
    const prisma = initializePrisma(c.env);
    const bucketName = getR2BucketName(c.env);

    // Get existing member to check for old image
    const existingMember = await prisma.member.findUnique({
      where: { id },
      select: { image: true },
    });

    if (!existingMember) {
      return c.json({
        meta: {
          code: 404,
          message: 'Member not found',
        },
        data: {},
      }, 404);
    }

    // Process image upload/update
    const imageResult = await processImageUpload({
      storage: c.env.STORAGE,
      imageKey: image,
      destinationDir: 'members',
      existingImageKey: existingMember.image,
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
      const member = await prisma.member.update({
        where: { id },
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          middleName: payload.middleName || null,
          suffix: payload.suffix || null,
          gender: payload.gender,
          status: payload.status,
          dateOfBirth: payload.dateOfBirth
            ? new Date(payload.dateOfBirth)
            : undefined,
          ...(imageResult.imageKey !== undefined && { image: imageResult.imageKey }),
          family: familyId ? { connect: { id: familyId } } : { disconnect: true },
          updatedByUser: { connect: { id: user.id } },
        },
      });
      const memberWithPresignedImages = await replaceImageKeysWithPresignedUrls(
        c.env,
        member,
      );

      return c.json({
        meta: {
          code: 200,
          message: 'Member updated successfully',
        },
        data: {
          member: memberWithPresignedImages,
        },
      }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return c.json({
            meta: {
              code: 409,
              message: 'A member with this name already exists',
            },
            data: {},
          }, 409);
        }
        if (error.code === 'P2025') {
          return c.json({
            meta: {
              code: 404,
              message: 'Member not found',
            },
            data: {},
          }, 404);
        }
        if (error.code === 'P2003') {
          return c.json({
            meta: {
              code: 400,
              message: 'Family not found',
            },
            data: {},
          }, 400);
        }
      }
      throw error;
    }
  },
);
