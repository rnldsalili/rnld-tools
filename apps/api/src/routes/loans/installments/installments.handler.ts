import {
  InstallmentStatus,
  LoanLogEventType,
  NotificationEvent,
} from '@workspace/constants';
import {
  installmentAddSchema,
  installmentPaymentRecordSchema,
  installmentPaymentVoidSchema,
  installmentPaymentsQuerySchema,
  installmentUpdateSchema,
  loanInstallmentLoanIdParamSchema,
  loanInstallmentParamSchema,
  loanInstallmentPaymentParamSchema,
} from './installments.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { createLoanLog } from '@/api/lib/loans/logs';
import { dispatchEventNotifications } from '@/api/lib/notifications/dispatch';
import {
  calculateRecordedPayment,
  getInstallmentRemainingAmount,
  getInstallmentStatus,
  isInstallmentPaid,
  roundCurrencyAmount,
} from '@/api/lib/loans/payments';
import { validate } from '@/api/lib/validator';

const paymentOrderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

class InstallmentPaymentRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

function formatInstallment<T extends {
  amount: number;
  paidAmount: number;
  _count?: { payments: number };
}>(input: T) {
  return {
    ...input,
    paidAmount: roundCurrencyAmount(input.paidAmount),
    remainingAmount: getInstallmentRemainingAmount(input.amount, input.paidAmount),
    paymentCount: input._count?.payments ?? 0,
  };
}

function normalizeRemarks(value: string | null | undefined) {
  return value?.trim() || null;
}

async function getLoanInstallmentOrNull(prisma: ReturnType<typeof initializePrisma>, loanId: string, installmentId: string) {
  return prisma.loanInstallment.findFirst({
    where: { id: installmentId, loanId },
    include: {
      _count: {
        select: {
          payments: {
            where: { voidedAt: null },
          },
        },
      },
    },
  });
}

async function getLoanForInstallmentNotifications(
  prisma: ReturnType<typeof initializePrisma>,
  loanId: string,
) {
  return prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      id: true,
      amount: true,
      currency: true,
      description: true,
      loanDate: true,
      excessBalance: true,
      notificationsEnabled: true,
      client: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      _count: {
        select: {
          installments: true,
        },
      },
    },
  });
}

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

    const installmentFound = await getLoanInstallmentOrNull(prisma, loanId, installmentId);
    if (!installmentFound) {
      return c.json({ meta: { code: 404, message: 'Installment not found' } }, 404);
    }

    const normalizedRemarks = installmentUpdatePayload.remarks !== undefined
      ? normalizeRemarks(installmentUpdatePayload.remarks)
      : undefined;
    const nextDueDateIso = installmentUpdatePayload.dueDate
      ? new Date(installmentUpdatePayload.dueDate).toISOString()
      : null;
    const changes: Record<string, unknown> = {};

    if (nextDueDateIso && installmentFound.dueDate.toISOString() !== nextDueDateIso) {
      changes.dueDate = {
        from: installmentFound.dueDate.toISOString(),
        to: nextDueDateIso,
      };
    }

    if (
      installmentUpdatePayload.amount !== undefined
      && roundCurrencyAmount(installmentUpdatePayload.amount) !== roundCurrencyAmount(installmentFound.amount)
    ) {
      if (installmentFound.paidAmount > 0 || installmentFound._count.payments > 0) {
        return c.json({
          meta: {
            code: 422,
            message: 'Installment amount cannot be changed after payment activity has been recorded.',
          },
        }, 422);
      }

      changes.amount = {
        from: installmentFound.amount,
        to: installmentUpdatePayload.amount,
      };
    }

    if (normalizedRemarks !== undefined && normalizedRemarks !== installmentFound.remarks) {
      changes.remarks = {
        from: installmentFound.remarks,
        to: normalizedRemarks,
      };
    }

    const updatedInstallment = await prisma.loanInstallment.update({
      where: { id: installmentId },
      data: {
        ...(installmentUpdatePayload.dueDate !== undefined && { dueDate: new Date(installmentUpdatePayload.dueDate) }),
        ...(installmentUpdatePayload.amount !== undefined && { amount: installmentUpdatePayload.amount }),
        ...(installmentUpdatePayload.remarks !== undefined && { remarks: normalizedRemarks }),
        updatedBy: { connect: { id: authenticatedUser.id } },
      },
      include: {
        _count: {
          select: {
            payments: {
              where: { voidedAt: null },
            },
          },
        },
      },
    });

    if (Object.keys(changes).length > 0) {
      await createLoanLog(prisma, {
        loanId,
        installmentId,
        actorUserId: authenticatedUser.id,
        eventType: LoanLogEventType.INSTALLMENT_UPDATED,
        eventData: { changes },
      });
    }

    return c.json({
      meta: { code: 200, message: 'Installment updated successfully' },
      data: { installment: formatInstallment(updatedInstallment) },
    }, 200);
  },
);

export const deleteInstallment = createHandlers(
  validate('param', loanInstallmentParamSchema),
  async (c) => {
    const { loanId, installmentId } = c.req.valid('param');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const installmentFound = await getLoanInstallmentOrNull(prisma, loanId, installmentId);
    if (!installmentFound) {
      return c.json({ meta: { code: 404, message: 'Installment not found' } }, 404);
    }

    if (installmentFound.paidAmount > 0 || installmentFound._count.payments > 0) {
      return c.json({
        meta: {
          code: 422,
          message: 'Installments with payment activity cannot be deleted.',
        },
      }, 422);
    }

    await prisma.loanInstallment.delete({ where: { id: installmentId } });

    await createLoanLog(prisma, {
      loanId,
      installmentId,
      actorUserId: authenticatedUser.id,
      eventType: LoanLogEventType.INSTALLMENT_DELETED,
      eventData: {
        amount: installmentFound.amount,
        dueDate: installmentFound.dueDate.toISOString(),
        remarks: installmentFound.remarks,
      },
    });

    return c.json({ meta: { code: 200, message: 'Installment deleted successfully' } }, 200);
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
        paidAmount: 0,
        remarks: normalizeRemarks(remarks),
        createdBy: { connect: { id: authenticatedUser.id } },
        updatedBy: { connect: { id: authenticatedUser.id } },
      },
      include: {
        _count: {
          select: {
            payments: {
              where: { voidedAt: null },
            },
          },
        },
      },
    });

    await createLoanLog(prisma, {
      loanId,
      installmentId: installment.id,
      actorUserId: authenticatedUser.id,
      eventType: LoanLogEventType.INSTALLMENT_ADDED,
      eventData: {
        amount: installment.amount,
        dueDate: installment.dueDate.toISOString(),
        remarks: installment.remarks,
      },
    });

    return c.json({
      meta: { code: 201, message: 'Installment added successfully' },
      data: { installment: formatInstallment(installment) },
    }, 201);
  },
);

export const getInstallmentPayments = createHandlers(
  validate('param', loanInstallmentParamSchema),
  validate('query', installmentPaymentsQuerySchema),
  async (c) => {
    const { loanId, installmentId } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const installmentFound = await prisma.loanInstallment.findFirst({
      where: { id: installmentId, loanId },
      select: { id: true },
    });
    if (!installmentFound) {
      return c.json({ meta: { code: 404, message: 'Installment not found' } }, 404);
    }

    const skipCount = (page - 1) * limit;
    const [payments, totalPayments, latestActivePayment] = await Promise.all([
      prisma.loanInstallmentPayment.findMany({
        where: { loanId, installmentId },
        orderBy: paymentOrderBy,
        skip: skipCount,
        take: limit,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          voidedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.loanInstallmentPayment.count({ where: { loanId, installmentId } }),
      prisma.loanInstallmentPayment.findFirst({
        where: { loanId, voidedAt: null },
        orderBy: paymentOrderBy,
        select: { id: true },
      }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Installment payments retrieved successfully' },
      data: {
        payments: payments.map((payment) => ({
          ...payment,
          canVoid: payment.voidedAt === null && payment.id === latestActivePayment?.id,
        })),
        pagination: {
          page,
          limit,
          total: totalPayments,
          totalPages: Math.ceil(totalPayments / limit),
        },
      },
    }, 200);
  },
);

export const recordInstallmentPayment = createHandlers(
  validate('param', loanInstallmentParamSchema),
  validate('json', installmentPaymentRecordSchema),
  async (c) => {
    const { loanId, installmentId } = c.req.valid('param');
    const paymentPayload = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    try {
      const [loanFound, installmentFound] = await Promise.all([
        getLoanForInstallmentNotifications(prisma, loanId),
        prisma.loanInstallment.findFirst({
          where: { id: installmentId, loanId },
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
      ]);

      if (!loanFound) {
        throw new InstallmentPaymentRequestError('Loan not found', 404);
      }

      if (!installmentFound) {
        throw new InstallmentPaymentRequestError('Installment not found', 404);
      }

      if (isInstallmentPaid(installmentFound.amount, installmentFound.paidAmount)) {
        throw new InstallmentPaymentRequestError('Installment is already paid', 400);
      }

      if (paymentPayload.cashAmount <= 0 && !paymentPayload.applyAvailableExcess) {
        throw new InstallmentPaymentRequestError(
          'Record a payment amount or apply available excess to continue.',
          422,
        );
      }

      const paymentBreakdown = calculateRecordedPayment({
        applyAvailableExcess: paymentPayload.applyAvailableExcess,
        availableExcess: loanFound.excessBalance,
        cashAmount: paymentPayload.cashAmount,
        installmentAmount: installmentFound.amount,
        paidAmount: installmentFound.paidAmount,
      });

      if (paymentBreakdown.appliedAmount <= 0 && paymentBreakdown.excessCreatedAmount <= 0) {
        throw new InstallmentPaymentRequestError('No payment could be applied to this installment.', 422);
      }

      const paymentDate = new Date(paymentPayload.paymentDate);
      const nextStatus = getInstallmentStatus(installmentFound.amount, paymentBreakdown.paidAmountAfter);
      const installmentPaidAt = nextStatus === InstallmentStatus.PAID ? new Date() : null;
      const shouldSendInstallmentPaidNotification = (
        installmentFound.status !== InstallmentStatus.PAID
        && nextStatus === InstallmentStatus.PAID
      );

      const createdPaymentId = crypto.randomUUID();
      const createdPayment = await prisma.loanInstallmentPayment.create({
        data: {
          id: createdPaymentId,
          loan: { connect: { id: loanId } },
          installment: { connect: { id: installmentId } },
          paymentDate,
          cashAmount: roundCurrencyAmount(paymentPayload.cashAmount),
          excessAppliedAmount: paymentBreakdown.excessAppliedAmount,
          excessCreatedAmount: paymentBreakdown.excessCreatedAmount,
          appliedAmount: paymentBreakdown.appliedAmount,
          remarks: normalizeRemarks(paymentPayload.remarks),
          createdBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          excessBalance: paymentBreakdown.excessBalanceAfter,
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
      });
      const updatedInstallment = await prisma.loanInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: paymentBreakdown.paidAmountAfter,
          status: nextStatus,
          paidAt: installmentPaidAt,
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          _count: {
            select: {
              payments: {
                where: { voidedAt: null },
              },
            },
          },
        },
      });
      await createLoanLog(prisma, {
        loanId,
        installmentId,
        paymentId: createdPaymentId,
        actorUserId: authenticatedUser.id,
        eventType: LoanLogEventType.PAYMENT_RECORDED,
        eventData: {
          appliedAmount: paymentBreakdown.appliedAmount,
          cashAmount: roundCurrencyAmount(paymentPayload.cashAmount),
          excessAppliedAmount: paymentBreakdown.excessAppliedAmount,
          excessBalanceAfter: paymentBreakdown.excessBalanceAfter,
          excessCreatedAmount: paymentBreakdown.excessCreatedAmount,
          paidAmountAfter: paymentBreakdown.paidAmountAfter,
          paymentDate: paymentDate.toISOString(),
          remainingAmountAfter: paymentBreakdown.remainingAmountAfter,
          remarks: normalizeRemarks(paymentPayload.remarks),
          statusAfter: nextStatus,
        },
      });

      if (shouldSendInstallmentPaidNotification) {
        await dispatchEventNotifications({
          env: c.env,
          prisma,
          event: NotificationEvent.INSTALLMENT_PAID,
          queuedByUserId: authenticatedUser.id,
          notificationsEnabled: loanFound.notificationsEnabled,
          context: {
            client: {
              name: loanFound.client.name,
              email: loanFound.client.email ?? '',
              phone: loanFound.client.phone ?? '',
            },
            loan: {
              id: loanFound.id,
              amount: loanFound.amount,
              currency: loanFound.currency,
              description: loanFound.description,
              loanDate: loanFound.loanDate.toISOString(),
              installmentCount: loanFound._count.installments,
            },
            installment: {
              amount: updatedInstallment.amount,
              dueDate: updatedInstallment.dueDate.toISOString(),
              paidAt: updatedInstallment.paidAt?.toISOString() ?? null,
            },
            user: {
              name: '',
              email: '',
              temporaryPassword: '',
            },
          },
        });
      }

      return c.json({
        meta: { code: 201, message: 'Payment recorded successfully' },
        data: {
          installment: formatInstallment(updatedInstallment),
          loan: updatedLoan,
          payment: createdPayment,
        },
      }, 201);
    } catch (paymentError) {
      if (paymentError instanceof InstallmentPaymentRequestError) {
        return c.json({
          meta: {
            code: paymentError.statusCode,
            message: paymentError.message,
          },
        }, { status: paymentError.statusCode as 400 | 404 | 422 });
      }

      throw paymentError;
    }
  },
);

export const voidInstallmentPayment = createHandlers(
  validate('param', loanInstallmentPaymentParamSchema),
  validate('json', installmentPaymentVoidSchema),
  async (c) => {
    const { loanId, installmentId, paymentId } = c.req.valid('param');
    const { voidReason } = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    try {
      const [loanFound, installmentFound, paymentFound, latestActivePayment] = await Promise.all([
        getLoanForInstallmentNotifications(prisma, loanId),
        prisma.loanInstallment.findFirst({
          where: { id: installmentId, loanId },
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
        prisma.loanInstallmentPayment.findFirst({
          where: { id: paymentId, loanId, installmentId },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            voidedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.loanInstallmentPayment.findFirst({
          where: { loanId, voidedAt: null },
          orderBy: paymentOrderBy,
          select: { id: true },
        }),
      ]);

      if (!loanFound) {
        throw new InstallmentPaymentRequestError('Loan not found', 404);
      }

      if (!installmentFound) {
        throw new InstallmentPaymentRequestError('Installment not found', 404);
      }

      if (!paymentFound) {
        throw new InstallmentPaymentRequestError('Payment not found', 404);
      }

      if (paymentFound.voidedAt) {
        throw new InstallmentPaymentRequestError('Payment is already voided', 400);
      }

      if (latestActivePayment?.id !== paymentFound.id) {
        throw new InstallmentPaymentRequestError(
          'Only the latest active payment on this loan can be voided.',
          422,
        );
      }

      const nextPaidAmount = roundCurrencyAmount(Math.max(0, installmentFound.paidAmount - paymentFound.appliedAmount));
      const nextExcessBalance = roundCurrencyAmount(
        Math.max(0, loanFound.excessBalance - paymentFound.excessCreatedAmount + paymentFound.excessAppliedAmount),
      );
      const nextStatus = getInstallmentStatus(installmentFound.amount, nextPaidAmount);
      const voidedAt = new Date();
      const trimmedVoidReason = voidReason.trim();

      const updatedPayment = await prisma.loanInstallmentPayment.update({
        where: { id: paymentId },
        data: {
          voidedAt,
          voidReason: trimmedVoidReason,
          voidedBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          voidedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          excessBalance: nextExcessBalance,
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
      });
      const updatedInstallment = await prisma.loanInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: nextPaidAmount,
          status: nextStatus,
          paidAt: nextStatus === InstallmentStatus.PAID ? installmentFound.paidAt : null,
          updatedBy: { connect: { id: authenticatedUser.id } },
        },
        include: {
          _count: {
            select: {
              payments: {
                where: { voidedAt: null },
              },
            },
          },
        },
      });
      await createLoanLog(prisma, {
        loanId,
        installmentId,
        paymentId,
        actorUserId: authenticatedUser.id,
        eventType: LoanLogEventType.PAYMENT_VOIDED,
        eventData: {
          appliedAmount: paymentFound.appliedAmount,
          cashAmount: paymentFound.cashAmount,
          excessAppliedAmount: paymentFound.excessAppliedAmount,
          excessBalanceAfter: nextExcessBalance,
          excessCreatedAmount: paymentFound.excessCreatedAmount,
          paidAmountAfter: nextPaidAmount,
          paymentDate: paymentFound.paymentDate.toISOString(),
          remainingAmountAfter: getInstallmentRemainingAmount(installmentFound.amount, nextPaidAmount),
          statusAfter: nextStatus,
          voidReason: trimmedVoidReason,
        },
      });

      return c.json({
        meta: { code: 200, message: 'Payment voided successfully' },
        data: {
          installment: formatInstallment(updatedInstallment),
          loan: updatedLoan,
          payment: updatedPayment,
        },
      }, 200);
    } catch (paymentError) {
      if (paymentError instanceof InstallmentPaymentRequestError) {
        return c.json({
          meta: {
            code: paymentError.statusCode,
            message: paymentError.message,
          },
        }, { status: paymentError.statusCode as 400 | 404 | 422 });
      }

      throw paymentError;
    }
  },
);
