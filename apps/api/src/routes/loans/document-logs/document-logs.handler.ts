import { loanDocumentLogLoanIdParamSchema, loanDocumentLogQuerySchema } from './document-logs.schema';
import { parseLoanDocumentLogEventData } from '@/api/lib/documents/logs';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';

export const getLoanDocumentLogs = createHandlers(
  validate('param', loanDocumentLogLoanIdParamSchema),
  validate('query', loanDocumentLogQuerySchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { templateId, token, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });

    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const skipCount = (page - 1) * limit;
    const loanDocumentLogFilter = {
      loanId,
      ...(templateId ? { templateId } : {}),
      ...(token ? { token } : {}),
    };

    const [loanDocumentLogs, totalLoanDocumentLogs] = await Promise.all([
      prisma.loanDocumentLog.findMany({
        where: loanDocumentLogFilter,
        orderBy: { createdAt: 'desc' },
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
      prisma.loanDocumentLog.count({ where: loanDocumentLogFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Loan document logs retrieved successfully' },
      data: {
        logs: loanDocumentLogs.map((loanDocumentLog) => ({
          ...loanDocumentLog,
          eventData: parseLoanDocumentLogEventData(loanDocumentLog.eventData),
        })),
        pagination: {
          page,
          limit,
          total: totalLoanDocumentLogs,
          totalPages: Math.ceil(totalLoanDocumentLogs / limit),
        },
      },
    }, 200);
  },
);
