import {
  installmentUpdateSchema,
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
          ...(installmentUpdatePayload.status !== undefined && { status: installmentUpdatePayload.status }),
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
