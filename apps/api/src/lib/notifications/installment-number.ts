import type { PrismaClient } from '@/prisma/client';

export async function getLoanInstallmentNumber(
  prisma: PrismaClient,
  params: {
    loanId: string;
    installmentId: string;
    dueDate: Date;
  },
) {
  const { loanId, installmentId, dueDate } = params;

  return prisma.loanInstallment.count({
    where: {
      loanId,
      OR: [
        {
          dueDate: {
            lt: dueDate,
          },
        },
        {
          dueDate,
          id: {
            lte: installmentId,
          },
        },
      ],
    },
  });
}
