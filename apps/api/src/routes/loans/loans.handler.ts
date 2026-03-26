import {
  ClientStatus,
  InstallmentInterval,
  InstallmentStatus,
  InstallmentType,
  LoanLogEventType,
  NotificationEvent,
} from '@workspace/constants';
import {
  loanCreateSchema,
  loanGetQuerySchema,
  loanIdParamSchema,
  loanInstallmentAttentionQuerySchema,
  loanLatestPaymentsQuerySchema,
  loanListQuerySchema,
  loanUpdateSchema,
} from './loans.schema';
import { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { getAccessibleLoanFilter } from '@/api/lib/loans/access';
import { createLoanLog } from '@/api/lib/loans/logs';
import { dispatchEventNotifications } from '@/api/lib/notifications/dispatch';
import {
  getInstallmentRemainingAmount,
  getInstallmentStatus,
  getManilaDayRange,
  roundCurrencyAmount,
} from '@/api/lib/loans/payments';
import { deleteStoredObject } from '@/api/lib/storage/storage';
import { validate } from '@/api/lib/validator';

type InstallmentAttentionCategory = 'overdue' | 'near_due';

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

function formatLoanInstallment<T extends {
  amount: number;
  paidAmount: number;
  dueReminderSentAt?: Date | null;
  overdueReminderSentAt?: Date | null;
  _count?: { payments: number };
}>(input: T) {
  const {
    dueReminderSentAt: _dueReminderSentAt,
    overdueReminderSentAt: _overdueReminderSentAt,
    ...installmentData
  } = input;
  const remainingAmount = getInstallmentRemainingAmount(installmentData.amount, installmentData.paidAmount);

  return {
    ...installmentData,
    paidAmount: roundCurrencyAmount(installmentData.paidAmount),
    remainingAmount,
    paymentCount: installmentData._count?.payments ?? 0,
  };
}

function getInstallmentAttentionCategory(params: {
  dueDate: Date;
  currentManilaDayStart: Date;
  nearDueWindowEnd: Date;
}): InstallmentAttentionCategory | null {
  if (params.dueDate.getTime() < params.currentManilaDayStart.getTime()) {
    return 'overdue';
  }

  if (
    params.dueDate.getTime() >= params.currentManilaDayStart.getTime()
    && params.dueDate.getTime() < params.nearDueWindowEnd.getTime()
  ) {
    return 'near_due';
  }

  return null;
}

export const getLoans = createHandlers(
  validate('query', loanListQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);
    const authenticatedUser = c.get('user');

    const skipCount = (page - 1) * limit;
    const loanFilter = await getAccessibleLoanFilter(prisma, authenticatedUser, search);

    const [loans, totalLoans] = await Promise.all([
      prisma.loan.findMany({
        where: loanFilter,
        orderBy: [
          { loanDate: 'desc' },
          { client: { name: 'asc' } },
        ],
        skip: skipCount,
        take: limit,
        include: {
          client: true,
          _count: { select: { installments: true } },
          installments: {
            select: {
              status: true,
            },
          },
        },
      }),
      prisma.loan.count({ where: loanFilter }),
    ]);

    const formattedLoans = loans.map(({ installments, ...loan }) => ({
      ...loan,
      paidInstallmentsCount: installments.filter((installment) => installment.status === InstallmentStatus.PAID).length,
    }));

    return c.json({
      meta: { code: 200, message: 'Loans retrieved successfully' },
      data: {
        loans: formattedLoans,
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

export const getInstallmentAttention = createHandlers(
  validate('query', loanInstallmentAttentionQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);
    const authenticatedUser = c.get('user');
    const skipCount = (page - 1) * limit;
    const referenceDate = new Date();
    const currentManilaDayStart = getManilaDayRange(referenceDate).start;
    const nearDueWindowEnd = getManilaDayRange(referenceDate, 3).start;
    const loanFilter = await getAccessibleLoanFilter(prisma, authenticatedUser, search);

    const baseInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
      paidAt: null,
      status: {
        not: InstallmentStatus.PAID,
      },
      loan: {
        is: loanFilter,
      },
    };
    const overdueInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
      ...baseInstallmentFilter,
      dueDate: {
        lt: currentManilaDayStart,
      },
    };
    const nearDueInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
      ...baseInstallmentFilter,
      dueDate: {
        gte: currentManilaDayStart,
        lt: nearDueWindowEnd,
      },
    };

    const [overdueInstallmentCount, nearDueInstallmentCount] = await Promise.all([
      prisma.loanInstallment.count({ where: overdueInstallmentFilter }),
      prisma.loanInstallment.count({ where: nearDueInstallmentFilter }),
    ]);
    const totalInstallments = overdueInstallmentCount + nearDueInstallmentCount;
    const overdueTakeCount = skipCount < overdueInstallmentCount
      ? Math.min(limit, overdueInstallmentCount - skipCount)
      : 0;
    const overdueSkipCount = skipCount < overdueInstallmentCount ? skipCount : overdueInstallmentCount;
    const nearDueSkipCount = skipCount > overdueInstallmentCount
      ? skipCount - overdueInstallmentCount
      : 0;
    const nearDueTakeCount = limit - overdueTakeCount;

    const installmentSelect = {
      id: true,
      loanId: true,
      dueDate: true,
      amount: true,
      paidAmount: true,
      status: true,
      loan: {
        select: {
          currency: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    } satisfies Prisma.LoanInstallmentSelect;

    const [overdueInstallments, nearDueInstallments] = await Promise.all([
      overdueTakeCount > 0
        ? prisma.loanInstallment.findMany({
            where: overdueInstallmentFilter,
            orderBy: [
              { dueDate: 'asc' },
              { id: 'asc' },
            ],
            skip: overdueSkipCount,
            take: overdueTakeCount,
            select: installmentSelect,
          })
        : Promise.resolve([]),
      nearDueTakeCount > 0
        ? prisma.loanInstallment.findMany({
            where: nearDueInstallmentFilter,
            orderBy: [
              { dueDate: 'asc' },
              { id: 'asc' },
            ],
            skip: nearDueSkipCount,
            take: nearDueTakeCount,
            select: installmentSelect,
          })
        : Promise.resolve([]),
    ]);

    const installments = [...overdueInstallments, ...nearDueInstallments]
      .map((installment) => {
        const normalizedStatus = getInstallmentStatus({
          amount: installment.amount,
          paidAmount: installment.paidAmount,
          dueDate: installment.dueDate,
          currentStatus: installment.status,
          referenceDate,
        });

        if (normalizedStatus === InstallmentStatus.PAID) {
          return null;
        }

        const attentionCategory = getInstallmentAttentionCategory({
          dueDate: installment.dueDate,
          currentManilaDayStart,
          nearDueWindowEnd,
        });

        if (!attentionCategory) {
          return null;
        }

        return {
          id: installment.id,
          loanId: installment.loanId,
          dueDate: installment.dueDate.toISOString(),
          amount: installment.amount,
          paidAmount: roundCurrencyAmount(installment.paidAmount),
          remainingAmount: getInstallmentRemainingAmount(installment.amount, installment.paidAmount),
          currency: installment.loan.currency,
          status: normalizedStatus,
          attentionCategory,
          client: {
            id: installment.loan.client.id,
            name: installment.loan.client.name,
          },
        };
      })
      .filter((installment) => installment !== null);

    return c.json({
      meta: { code: 200, message: 'Installments requiring attention retrieved successfully' },
      data: {
        installments,
        pagination: {
          page,
          limit,
          total: totalInstallments,
          totalPages: Math.ceil(totalInstallments / limit),
        },
      },
    }, 200);
  },
);

export const getLatestPaidInstallments = createHandlers(
  validate('query', loanLatestPaymentsQuerySchema),
  async (c) => {
    const { search, page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);
    const authenticatedUser = c.get('user');
    const skipCount = (page - 1) * limit;
    const loanFilter = await getAccessibleLoanFilter(prisma, authenticatedUser, search);

    const latestPaidInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
      paidAt: {
        not: null,
      },
      status: InstallmentStatus.PAID,
      loan: {
        is: loanFilter,
      },
    };

    const [installments, totalInstallments] = await Promise.all([
      prisma.loanInstallment.findMany({
        where: latestPaidInstallmentFilter,
        orderBy: [
          { paidAt: 'desc' },
          { id: 'desc' },
        ],
        skip: skipCount,
        take: limit,
        select: {
          id: true,
          loanId: true,
          dueDate: true,
          amount: true,
          paidAmount: true,
          paidAt: true,
          status: true,
          updatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: {
            where: {
              voidedAt: null,
            },
            orderBy: [
              { createdAt: 'desc' },
              { id: 'desc' },
            ],
            take: 1,
            select: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          loan: {
            select: {
              currency: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.loanInstallment.count({ where: latestPaidInstallmentFilter }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Latest paid installments retrieved successfully' },
      data: {
        installments: installments.map((installment) => {
          const paidByUser = installment.payments[0]?.createdBy ?? installment.updatedBy;

          return {
            id: installment.id,
            loanId: installment.loanId,
            dueDate: installment.dueDate.toISOString(),
            amount: roundCurrencyAmount(installment.amount),
            paidAmount: roundCurrencyAmount(installment.paidAmount),
            paidAt: installment.paidAt?.toISOString() ?? null,
            status: installment.status,
            currency: installment.loan.currency,
            paidByUser: {
              id: paidByUser.id,
              name: paidByUser.name,
            },
            client: {
              id: installment.loan.client.id,
              name: installment.loan.client.name,
            },
          };
        }),
        pagination: {
          page,
          limit,
          total: totalInstallments,
          totalPages: Math.ceil(totalInstallments / limit),
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
    const authenticatedUser = c.get('user');

    const loanFound = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        client: true,
      },
    });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    if (!authenticatedUser.hasSuperAdminRole) {
      const isCreator = loanFound.createdByUserId === authenticatedUser.id;
      const isAssignee = await prisma.loanAssignment.findUnique({
        where: { loanId_userId: { loanId, userId: authenticatedUser.id } },
      });

      if (!isCreator && !isAssignee) {
        return c.json({ meta: { code: 403, message: 'Forbidden' } }, 403);
      }
    }

    const skipCount = (page - 1) * limit;

    const [loanInstallments, totalInstallments] = await Promise.all([
      prisma.loanInstallment.findMany({
        where: { loanId: loanId },
        orderBy: { dueDate: 'asc' },
        skip: skipCount,
        take: limit,
        include: {
          _count: {
            select: {
              payments: {
                where: { voidedAt: null },
              },
            },
          },
        },
      }),
      prisma.loanInstallment.count({ where: { loanId: loanId } }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Loan retrieved successfully' },
      data: {
        loan: {
          ...loanFound,
          installments: loanInstallments.map(formatLoanInstallment),
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
        excessBalance: 0,
        notificationsEnabled: loanPayload.notificationsEnabled ?? true,
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

    await createLoanLog(prisma, {
      loanId: createdLoan.id,
      actorUserId: authenticatedUser.id,
      eventType: LoanLogEventType.LOAN_CREATED,
      eventData: {
        amount: createdLoan.amount,
        clientId: createdLoan.clientId,
        currency: createdLoan.currency,
        installmentInterval: createdLoan.installmentInterval,
        interestRate: createdLoan.interestRate,
        loanDate: createdLoan.loanDate.toISOString(),
      },
    });

    if (createdInstallments) {
      for (const installment of createdInstallments) {
        await createLoanLog(prisma, {
          loanId: createdLoan.id,
          installmentId: installment.id,
          actorUserId: authenticatedUser.id,
          eventType: LoanLogEventType.INSTALLMENT_ADDED,
          eventData: {
            amount: installment.amount,
            dueDate: installment.dueDate.toISOString(),
            remarks: installment.remarks,
          },
        });
      }
    }

    await dispatchEventNotifications({
      env: c.env,
      prisma,
      event: NotificationEvent.LOAN_CREATED,
      queuedByUserId: authenticatedUser.id,
      notificationsEnabled: createdLoan.notificationsEnabled,
      context: {
        client: {
          name: createdLoan.client.name,
          email: createdLoan.client.email ?? '',
          phone: createdLoan.client.phone ?? '',
        },
        loan: {
          id: createdLoan.id,
          amount: createdLoan.amount,
          excessBalance: createdLoan.excessBalance,
          currency: createdLoan.currency,
          description: createdLoan.description,
          loanDate: createdLoan.loanDate.toISOString(),
          installmentCount: createdInstallments?.length ?? 0,
        },
        document: {
          name: '',
          signUrl: '',
          signedAt: null,
        },
        installment: {
          number: createdInstallments?.[0] ? 1 : null,
          amount: createdInstallments?.[0]?.amount ?? null,
          dueDate: createdInstallments?.[0]?.dueDate.toISOString() ?? null,
          paidAt: createdInstallments?.[0]?.paidAt?.toISOString() ?? null,
        },
        user: {
          name: '',
          email: '',
          temporaryPassword: '',
        },
      },
    });

    return c.json({
      meta: { code: 201, message: 'Loan created successfully' },
      data: {
        loan: {
          ...createdLoan,
          installments: createdInstallments?.map((installment) => formatLoanInstallment({
            ...installment,
            _count: { payments: 0 },
          })) ?? null,
        },
      },
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
          amount: true,
          notificationsEnabled: true,
          installmentInterval: true,
          interestRate: true,
          description: true,
          loanDate: true,
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
          ...(loanUpdatePayload.notificationsEnabled !== undefined && {
            notificationsEnabled: loanUpdatePayload.notificationsEnabled,
          }),
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

      const updatedLoanChanges: Record<string, unknown> = {};

      if (loanUpdatePayload.clientId !== undefined && loanUpdatePayload.clientId !== existingLoan.clientId) {
        updatedLoanChanges.clientId = {
          from: existingLoan.clientId,
          to: loanUpdatePayload.clientId,
        };
      }

      if (loanUpdatePayload.amount !== undefined && roundCurrencyAmount(loanUpdatePayload.amount) !== roundCurrencyAmount(existingLoan.amount)) {
        updatedLoanChanges.amount = {
          from: existingLoan.amount,
          to: loanUpdatePayload.amount,
        };
      }

      if (
        loanUpdatePayload.notificationsEnabled !== undefined
        && loanUpdatePayload.notificationsEnabled !== existingLoan.notificationsEnabled
      ) {
        updatedLoanChanges.notificationsEnabled = {
          from: existingLoan.notificationsEnabled,
          to: loanUpdatePayload.notificationsEnabled,
        };
      }

      if (
        loanUpdatePayload.installmentInterval !== undefined
        && loanUpdatePayload.installmentInterval !== existingLoan.installmentInterval
      ) {
        updatedLoanChanges.installmentInterval = {
          from: existingLoan.installmentInterval,
          to: loanUpdatePayload.installmentInterval,
        };
      }

      if (
        loanUpdatePayload.interestRate !== undefined
        && loanUpdatePayload.interestRate !== existingLoan.interestRate
      ) {
        updatedLoanChanges.interestRate = {
          from: existingLoan.interestRate,
          to: loanUpdatePayload.interestRate,
        };
      }

      if (
        loanUpdatePayload.description !== undefined
        && (loanUpdatePayload.description?.trim() || null) !== existingLoan.description
      ) {
        updatedLoanChanges.description = {
          from: existingLoan.description,
          to: loanUpdatePayload.description?.trim() || null,
        };
      }

      const nextLoanDate = new Date(loanUpdatePayload.loanDate).toISOString();
      if (existingLoan.loanDate.toISOString() !== nextLoanDate) {
        updatedLoanChanges.loanDate = {
          from: existingLoan.loanDate.toISOString(),
          to: nextLoanDate,
        };
      }

      if (Object.keys(updatedLoanChanges).length > 0) {
        await createLoanLog(prisma, {
          loanId,
          actorUserId: authenticatedUser.id,
          eventType: LoanLogEventType.LOAN_UPDATED,
          eventData: { changes: updatedLoanChanges },
        });
      }

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
      const loanAttachmentKeys = Array.from(
        new Set(
          (
            await prisma.loanAttachment.findMany({
              where: { loanId },
              select: { storageKey: true },
            })
          ).map((loanAttachment) => loanAttachment.storageKey),
        ),
      );

      await Promise.all(signatureKeys.map((signatureKey) => deleteStoredObject(c.env.STORAGE, signatureKey)));
      await Promise.all(loanAttachmentKeys.map((storageKey) => deleteStoredObject(c.env.STORAGE, storageKey)));
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
