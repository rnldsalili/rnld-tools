import type { Prisma, PrismaClient } from '@/prisma/client';

export async function getAccessibleLoanFilter(
  prisma: PrismaClient,
  authenticatedUser: {
    hasSuperAdminRole: boolean;
    id: string;
  },
  search?: string,
): Promise<Prisma.LoanWhereInput> {
  const loanFilter: Prisma.LoanWhereInput = search
    ? { client: { is: { name: { contains: search } } } }
    : {};

  if (authenticatedUser.hasSuperAdminRole) {
    return loanFilter;
  }

  const assignedLoanIds = await prisma.loanAssignment.findMany({
    where: { userId: authenticatedUser.id },
    select: { loanId: true },
  });
  const assignedLoanIdSet = new Set(assignedLoanIds.map((assignedLoan) => assignedLoan.loanId));

  loanFilter.OR = [
    { createdByUserId: authenticatedUser.id },
    { id: { in: Array.from(assignedLoanIdSet) } },
  ];

  return loanFilter;
}
