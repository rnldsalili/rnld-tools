import { ClientStatus, InstallmentInterval, InstallmentType } from '@workspace/constants';
import {
  loanCreateSchema,
  loanGetQuerySchema,
  loanIdParamSchema,
  loanListQuerySchema,
  loanUpdateSchema,
} from './loans.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { deleteImage } from '@/api/lib/storage/storage';
import { validate } from '@/api/lib/validator';

const addInterval = (startDate: Date, interval: InstallmentInterval, step: number): Date => {
  const originalDay = startDate.getDate();
  const resultDate = new Date(startDate);

  // Set day to 1 first to prevent month overflow (e.g. Mar 31 + 1 month → May 1 instead of Apr 30)
  resultDate.setDate(1);

  if (interval === InstallmentInterval.ANNUALLY) {
    resultDate.setFullYear(startDate.getFullYear() + step);
  } else {
    const monthsToAdd = interval === InstallmentInterval.QUARTERLY ? 3 : 1;
    resultDate.setMonth(startDate.getMonth() + monthsToAdd * step);
  }

  // Clamp to the last valid day of the target month
  const lastDayOfMonth = new Date(resultDate.getFullYear(), resultDate.getMonth() + 1, 0).getDate();
  resultDate.setDate(Math.min(originalDay, lastDayOfMonth));

  return resultDate;
};

async function getLoanClientOrNull(prisma: ReturnType<typeof initializePrisma>, clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      status: true,
    },
  });
}

export const getLoans = createHandlers(
  validate('query', loanListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skipCount = (page - 1) * limit;
    const loanFilter: Prisma.LoanWhereInput = search
      ? { client: { is: { name: { contains: search } } } }
      : {};

    const [loans, totalLoans] = await Promise.all([
      prisma.loan.findMany({
        where: loanFilter,
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take: limit,
        include: {
          client: true,
          _count: { select: { installments: true } },
        },
      }),
      prisma.loan.count({ where: loanFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Loans retrieved successfully' },
      data: {
        loans,
        pagination: {
          page,
          limit,
          total: totalLoans,
          totalPages: Math.ceil(totalLoans / limit),
        },
      },
    }, 200);
  },
);

export const getLoan = createHandlers(
  validate('param', loanIdParamSchema),
  validate('query', loanGetQuerySchema),
  async (c) => {
    const { id: loanId } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        client: true,
      },
    });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const skipCount = (page - 1) * limit;

    const [loanInstallments, totalInstallments] = await Promise.all([
      prisma.loanInstallment.findMany({
        where: { loanId: loanId },
        orderBy: { dueDate: 'asc' },
        skip: skipCount,
        take: limit,
      }),
      prisma.loanInstallment.count({ where: { loanId: loanId } }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Loan retrieved successfully' },
      data: {
        loan: {
          ...loanFound,
          installments: loanInstallments,
          installmentsPagination: {
            page,
            limit,
            total: totalInstallments,
            totalPages: Math.ceil(totalInstallments / limit),
          },
        },
      },
    }, 200);
  },
);

export const createLoan = createHandlers(
  validate('json', loanCreateSchema),
  async (c) => {
    const loanPayload = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const clientFound = await getLoanClientOrNull(prisma, loanPayload.clientId);
    if (!clientFound) {
      return c.json({ meta: { code: 404, message: 'Client not found' } }, 404);
    }

    if (clientFound.status !== ClientStatus.ENABLED) {
      return c.json({ meta: { code: 422, message: 'Disabled clients cannot be used for new loans' } }, 422);
    }

    const createdLoan = await prisma.loan.create({
      data: {
        client: { connect: { id: loanPayload.clientId } },
        amount: loanPayload.amount,
        currency: loanPayload.currency,
        installmentInterval: loanPayload.installmentInterval,
        loanDate: new Date(loanPayload.loanDate),
        interestRate: loanPayload.interestRate ?? null,
        description: loanPayload.description?.trim() || null,
        createdBy: { connect: { id: authenticatedUser.id } },
        updatedBy: { connect: { id: authenticatedUser.id } },
      },
      include: {
        client: true,
      },
    });

    let createdInstallments = null;

    if (loanPayload.installments) {
      const installmentConfig = loanPayload.installments;

      if (installmentConfig.type === InstallmentType.SINGLE) {
        const singleInstallment = await prisma.loanInstallment.create({
          data: {
            loan: { connect: { id: createdLoan.id } },
            dueDate: new Date(installmentConfig.dueDate),
            amount: installmentConfig.amount,
            status: installmentConfig.status,
            createdBy: { connect: { id: authenticatedUser.id } },
            updatedBy: { connect: { id: authenticatedUser.id } },
          },
        });
        createdInstallments = [singleInstallment];
      } else {
        const baseDate = new Date(installmentConfig.startDate);
        const installmentRows = Array.from({ length: installmentConfig.count }, (_, index) => ({
          loanId: createdLoan.id,
          dueDate: addInterval(baseDate, installmentConfig.interval, index),
          amount: installmentConfig.amount,
          status: installmentConfig.status,
          createdByUserId: authenticatedUser.id,
          updatedByUserId: authenticatedUser.id,
        }));
        await prisma.loanInstallment.createMany({ data: installmentRows });
        createdInstallments = await prisma.loanInstallment.findMany({
          where: { loanId: createdLoan.id },
          orderBy: { dueDate: 'asc' },
        });
      }
    }

    return c.json({
      meta: { code: 201, message: 'Loan created successfully' },
      data: { loan: { ...createdLoan, installments: createdInstallments } },
    }, 201);
  },
);

export const updateLoan = createHandlers(
  validate('param', loanIdParamSchema),
  validate('json', loanUpdateSchema),
  async (c) => {
    const { id: loanId } = c.req.valid('param');
    const loanUpdatePayload = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    try {
      const existingLoan = await prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          clientId: true,
        },
      });

      if (!existingLoan) {
        return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
      }

      if (loanUpdatePayload.clientId && loanUpdatePayload.clientId !== existingLoan.clientId) {
        const nextClient = await getLoanClientOrNull(prisma, loanUpdatePayload.clientId);

        if (!nextClient) {
          return c.json({ meta: { code: 404, message: 'Client not found' } }, 404);
        }

        if (nextClient.status !== ClientStatus.ENABLED) {
          return c.json({ meta: { code: 422, message: 'Disabled clients cannot be assigned to loans' } }, 422);
        }
      }

      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          ...(loanUpdatePayload.clientId !== undefined && {
            client: { connect: { id: loanUpdatePayload.clientId } },
          }),
          ...(loanUpdatePayload.amount !== undefined && { amount: loanUpdatePayload.amount }),
          ...(loanUpdatePayload.installmentInterval !== undefined && {
            installmentInterval: loanUpdatePayload.installmentInterval,
          }),
          loanDate: new Date(loanUpdatePayload.loanDate),
          ...(loanUpdatePayload.interestRate !== undefined && { interestRate: loanUpdatePayload.interestRate }),
          ...(loanUpdatePayload.description !== undefined && { description: loanUpdatePayload.description?.trim() || null }),
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          client: true,
        },
      });

      return c.json({
        meta: { code: 200, message: 'Loan updated successfully' },
        data: { loan: updatedLoan },
      }, 200);
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
      }
      throw dbError;
    }
  },
);

export const deleteLoan = createHandlers(
  validate('param', loanIdParamSchema),
  async (c) => {
    const { id: loanId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    try {
      const loanDocumentsWithSignatures = await prisma.loanDocument.findMany({
        where: {
          loanId,
          signatureKey: {
            not: null,
          },
        },
        select: {
          signatureKey: true,
        },
      });
      const signatureKeys = Array.from(
        new Set(
          loanDocumentsWithSignatures
            .map((loanDocument) => loanDocument.signatureKey)
            .filter((signatureKey): signatureKey is string => Boolean(signatureKey)),
        ),
      );

      await Promise.all(signatureKeys.map((signatureKey) => deleteImage(c.env.STORAGE, signatureKey)));
      await prisma.loan.delete({ where: { id: loanId } });
      return c.json({ meta: { code: 200, message: 'Loan deleted successfully' } }, 200);
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
      }
      throw dbError;
    }
  },
);
