import { loanLogLoanIdParamSchema, loanLogsQuerySchema } from './logs.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { parseLoanLogEventData } from '@/api/lib/loans/logs';
import { validate } from '@/api/lib/validator';

export const getLoanLogs = createHandlers(
  validate('param', loanLogLoanIdParamSchema),
  validate('query', loanLogsQuerySchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });

    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const skipCount = (page - 1) * limit;
    const [logs, totalLogs] = await Promise.all([
      prisma.loanLog.findMany({
        where: { loanId },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: skipCount,
        take: limit,
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.loanLog.count({ where: { loanId } }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Loan activity logs retrieved successfully' },
      data: {
        logs: logs.map((log) => ({
          ...log,
          eventData: parseLoanLogEventData(log.eventData),
        })),
        pagination: {
          page,
          limit,
          total: totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
        },
      },
    }, 200);
  },
);
