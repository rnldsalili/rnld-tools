import { InstallmentInterval, InstallmentStatus, InstallmentType } from '@workspace/constants';
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
import { validate } from '@/api/lib/validator';

const addInterval = (startDate: Date, interval: InstallmentInterval, step: number): Date => {
  const resultDate = new Date(startDate);
  if (interval === InstallmentInterval.ANNUALLY) {
    resultDate.setFullYear(resultDate.getFullYear() + step);
  } else {
    const monthsToAdd = interval === InstallmentInterval.QUARTERLY ? 3 : 1;
    resultDate.setMonth(resultDate.getMonth() + monthsToAdd * step);
  }
  return resultDate;
};

const buildInstallmentFilter = (): Prisma.LoanInstallmentWhereInput => {
  const currentDate = new Date();
  return {
    NOT: {
      AND: [
        { dueDate: { lt: currentDate } },
        { status: InstallmentStatus.PAID },
      ],
    },
  };
};

export const getLoans = createHandlers(
  validate('query', loanListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skipCount = (page - 1) * limit;
    const loanFilter: Prisma.LoanWhereInput = search
      ? { borrower: { contains: search } }
      : {};

    const [loans, totalLoans] = await Promise.all([
      prisma.loan.findMany({
        where: loanFilter,
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take: limit,
        include: { _count: { select: { installments: true } } },
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

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const skipCount = (page - 1) * limit;
    const installmentFilter = buildInstallmentFilter();

    const [loanInstallments, totalInstallments] = await Promise.all([
      prisma.loanInstallment.findMany({
        where: { loanId: loanId, ...installmentFilter },
        orderBy: { dueDate: 'asc' },
        skip: skipCount,
        take: limit,
      }),
      prisma.loanInstallment.count({ where: { loanId: loanId, ...installmentFilter } }),
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

    const createdLoan = await prisma.loan.create({
      data: {
        borrower: loanPayload.borrower,
        amount: loanPayload.amount,
        currency: loanPayload.currency,
        interestRate: loanPayload.interestRate ?? null,
        phone: loanPayload.phone?.trim() || null,
        email: loanPayload.email?.trim() || null,
        description: loanPayload.description?.trim() || null,
        createdBy: { connect: { id: authenticatedUser.id } },
        updatedBy: { connect: { id: authenticatedUser.id } },
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
            status: installmentConfig.status,
            remarks: installmentConfig.remarks?.trim() || null,
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
          status: installmentConfig.status,
          remarks: installmentConfig.remarks?.trim() || null,
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
      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          ...(loanUpdatePayload.borrower !== undefined && { borrower: loanUpdatePayload.borrower }),
          ...(loanUpdatePayload.amount !== undefined && { amount: loanUpdatePayload.amount }),
          ...(loanUpdatePayload.interestRate !== undefined && { interestRate: loanUpdatePayload.interestRate }),
          ...(loanUpdatePayload.phone !== undefined && { phone: loanUpdatePayload.phone?.trim() || null }),
          ...(loanUpdatePayload.email !== undefined && { email: loanUpdatePayload.email?.trim() || null }),
          ...(loanUpdatePayload.description !== undefined && { description: loanUpdatePayload.description?.trim() || null }),
          updatedBy: { connect: { id: authenticatedUser.id } },
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


