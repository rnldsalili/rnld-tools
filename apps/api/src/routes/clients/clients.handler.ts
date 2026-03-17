import {
  clientCreateSchema,
  clientIdParamSchema,
  clientListQuerySchema,
  clientUpdateSchema,
} from './clients.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';

export const getClients = createHandlers(
  validate('query', clientListQuerySchema),
  async (c) => {
    const { search, status, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skipCount = (page - 1) * limit;
    const normalizedSearch = search?.trim();
    const clientFilter: Prisma.ClientWhereInput = {
      ...(status ? { status } : {}),
      ...(normalizedSearch
        ? {
          OR: [
            { name: { contains: normalizedSearch } },
            { phone: { contains: normalizedSearch } },
            { email: { contains: normalizedSearch } },
            { address: { contains: normalizedSearch } },
          ],
        }
        : {}),
    };

    const [clients, totalClients] = await Promise.all([
      prisma.client.findMany({
        where: clientFilter,
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take: limit,
        include: {
          _count: {
            select: {
              loans: true,
            },
          },
        },
      }),
      prisma.client.count({ where: clientFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Clients retrieved successfully' },
      data: {
        clients,
        pagination: {
          page,
          limit,
          total: totalClients,
          totalPages: Math.ceil(totalClients / limit),
        },
      },
    }, 200);
  },
);

export const getClient = createHandlers(
  validate('param', clientIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const clientFound = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    if (!clientFound) {
      return c.json({ meta: { code: 404, message: 'Client not found' } }, 404);
    }

    return c.json({
      meta: { code: 200, message: 'Client retrieved successfully' },
      data: {
        client: clientFound,
      },
    }, 200);
  },
);

export const createClient = createHandlers(
  validate('json', clientCreateSchema),
  async (c) => {
    const clientPayload = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const createdClient = await prisma.client.create({
      data: {
        name: clientPayload.name.trim(),
        phone: clientPayload.phone?.trim() || null,
        email: clientPayload.email?.trim() || null,
        address: clientPayload.address?.trim() || null,
        status: clientPayload.status,
        createdBy: { connect: { id: authenticatedUser.id } },
        updatedBy: { connect: { id: authenticatedUser.id } },
      },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 201, message: 'Client created successfully' },
      data: { client: createdClient },
    }, 201);
  },
);

export const updateClient = createHandlers(
  validate('param', clientIdParamSchema),
  validate('json', clientUpdateSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const clientPayload = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    try {
      const updatedClient = await prisma.client.update({
        where: { id },
        data: {
          ...(clientPayload.name !== undefined && { name: clientPayload.name.trim() }),
          ...(clientPayload.phone !== undefined && { phone: clientPayload.phone?.trim() || null }),
          ...(clientPayload.email !== undefined && { email: clientPayload.email?.trim() || null }),
          ...(clientPayload.address !== undefined && { address: clientPayload.address?.trim() || null }),
          ...(clientPayload.status !== undefined && { status: clientPayload.status }),
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          _count: {
            select: {
              loans: true,
            },
          },
        },
      });

      return c.json({
        meta: { code: 200, message: 'Client updated successfully' },
        data: { client: updatedClient },
      }, 200);
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        return c.json({ meta: { code: 404, message: 'Client not found' } }, 404);
      }

      throw dbError;
    }
  },
);
