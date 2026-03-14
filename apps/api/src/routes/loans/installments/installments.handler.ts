import { InstallmentStatus } from '@workspace/constants';
import {
  installmentAddSchema,
  installmentMarkPaidSchema,
  installmentUpdateSchema,
  loanInstallmentLoanIdParamSchema,
  loanInstallmentParamSchema,
} from './installments.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';

export const updateInstallment = createHandlers(
  validate('param', loanInstallmentParamSchema),
  validate('json', installmentUpdateSchema),
  async (c) => {
    const { loanId, installmentId } = c.req.valid('param');
    const installmentUpdatePayload = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    try {
      const updatedInstallment = await prisma.loanInstallment.update({
        where: { id: installmentId, loanId },
        data: {
          ...(installmentUpdatePayload.dueDate !== undefined && { dueDate: new Date(installmentUpdatePayload.dueDate) }),
          ...(installmentUpdatePayload.amount !== undefined && { amount: installmentUpdatePayload.amount }),
          ...(installmentUpdatePayload.remarks !== undefined && { remarks: installmentUpdatePayload.remarks?.trim() || null }),
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
      });

      return c.json({
        meta: { code: 200, message: 'Installment updated successfully' },
        data: { installment: updatedInstallment },
      }, 200);
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        return c.json({ meta: { code: 404, message: 'Installment not found' } }, 404);
      }
      throw dbError;
    }
  },
);

export const deleteInstallment = createHandlers(
  validate('param', loanInstallmentParamSchema),
  async (c) => {
    const { loanId, installmentId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    try {
      await prisma.loanInstallment.delete({ where: { id: installmentId, loanId } });
      return c.json({ meta: { code: 200, message: 'Installment deleted successfully' } }, 200);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return c.json({ meta: { code: 404, message: 'Installment not found' } }, 404);
      }
      throw error;
    }
  },
);

export const addInstallment = createHandlers(
  validate('param', loanInstallmentLoanIdParamSchema),
  validate('json', installmentAddSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { dueDate, amount, remarks } = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const installment = await prisma.loanInstallment.create({
      data: {
        loan: { connect: { id: loanId } },
        dueDate: new Date(dueDate),
        amount,
        remarks: remarks?.trim() || null,
        createdBy: { connect: { id: authenticatedUser.id } },
        updatedBy: { connect: { id: authenticatedUser.id } },
      },
    });

    return c.json({
      meta: { code: 201, message: 'Installment added successfully' },
      data: { installment },
    }, 201);
  },
);

export const markInstallmentPaid = createHandlers(
  validate('param', loanInstallmentParamSchema),
  validate('json', installmentMarkPaidSchema),
  async (c) => {
    const { loanId, installmentId } = c.req.valid('param');
    const { paidAt } = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const installmentFound = await prisma.loanInstallment.findUnique({
      where: { id: installmentId, loanId },
    });
    if (!installmentFound) {
      return c.json({ meta: { code: 404, message: 'Installment not found' } }, 404);
    }

    try {
      const updatedInstallment = await prisma.loanInstallment.update({
        where: { id: installmentId, loanId, status: { not: InstallmentStatus.PAID } },
        data: {
          status: InstallmentStatus.PAID,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
      });

      return c.json({
        meta: { code: 200, message: 'Installment marked as paid' },
        data: { installment: updatedInstallment },
      }, 200);
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
        return c.json({ meta: { code: 400, message: 'Installment is already paid' } }, 400);
      }
      throw dbError;
    }
  },
);
