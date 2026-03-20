import {
  InstallmentStatus,
  LoanLogEventType,
  NotificationEvent,
} from '@workspace/constants';
import type { NotificationEnv } from '@/api/lib/notifications/types';
import { initializePrisma } from '@/api/lib/db';
import { createLoanLog } from '@/api/lib/loans/logs';
import { getManilaDayRange } from '@/api/lib/loans/payments';
import { dispatchEventNotifications } from '@/api/lib/notifications/dispatch';

export const INSTALLMENT_REMINDER_CRON = '5 16 * * *';
export const INSTALLMENT_OVERDUE_STATUS_CRON = '5 16 * * *';

type ReminderTimestampField = 'dueReminderSentAt' | 'overdueReminderSentAt';

const reminderScheduleConfigs: Array<{
  event: NotificationEvent.INSTALLMENT_DUE_REMINDER | NotificationEvent.INSTALLMENT_OVERDUE_REMINDER;
  reminderOffsetDays: number;
  reminderTimestampField: ReminderTimestampField;
}> = [
  {
    event: NotificationEvent.INSTALLMENT_DUE_REMINDER,
    reminderOffsetDays: 3,
    reminderTimestampField: 'dueReminderSentAt',
  },
  {
    event: NotificationEvent.INSTALLMENT_OVERDUE_REMINDER,
    reminderOffsetDays: -1,
    reminderTimestampField: 'overdueReminderSentAt',
  },
];

export async function processInstallmentReminderSchedule(
  env: NotificationEnv,
  scheduledTime: number | Date,
) {
  const scheduledDate = new Date(scheduledTime);

  for (const reminderScheduleConfig of reminderScheduleConfigs) {
    try {
      await processInstallmentReminderBatch({
        env,
        scheduledDate,
        ...reminderScheduleConfig,
      });
    } catch (error) {
      console.error('Failed to process installment reminder batch', {
        event: reminderScheduleConfig.event,
        error: getErrorMessage(error),
      });
    }
  }
}

async function processInstallmentReminderBatch(params: {
  env: NotificationEnv;
  scheduledDate: Date;
  event: NotificationEvent.INSTALLMENT_DUE_REMINDER | NotificationEvent.INSTALLMENT_OVERDUE_REMINDER;
  reminderOffsetDays: number;
  reminderTimestampField: ReminderTimestampField;
}) {
  const { env, scheduledDate, event, reminderOffsetDays, reminderTimestampField } = params;
  const prisma = initializePrisma(env);
  const reminderDateRange = event === NotificationEvent.INSTALLMENT_DUE_REMINDER
    ? {
      start: getManilaDayRange(scheduledDate).start,
      end: getManilaDayRange(scheduledDate, reminderOffsetDays + 1).start,
    }
    : getManilaDayRange(scheduledDate, reminderOffsetDays);
  const reminderTimestamp = new Date();

  const installmentCandidates = await prisma.loanInstallment.findMany({
    where: {
      paidAt: null,
      status: {
        not: InstallmentStatus.PAID,
      },
      dueDate: {
        gte: reminderDateRange.start,
        lt: reminderDateRange.end,
      },
      ...(reminderTimestampField === 'dueReminderSentAt'
        ? { dueReminderSentAt: null }
        : { overdueReminderSentAt: null }),
      loan: {
        is: {
          notificationsEnabled: true,
        },
      },
    },
    include: {
      loan: {
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          loanDate: true,
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
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { id: 'asc' },
    ],
  });

  for (const installmentCandidate of installmentCandidates) {
    try {
      const dispatchResult = await dispatchEventNotifications({
        env,
        prisma,
        event,
        queuedByUserId: null,
        notificationsEnabled: installmentCandidate.loan.notificationsEnabled,
        context: {
          client: {
            name: installmentCandidate.loan.client.name,
            email: installmentCandidate.loan.client.email ?? '',
            phone: installmentCandidate.loan.client.phone ?? '',
          },
          loan: {
            id: installmentCandidate.loan.id,
            amount: installmentCandidate.loan.amount,
            currency: installmentCandidate.loan.currency,
            description: installmentCandidate.loan.description,
            loanDate: installmentCandidate.loan.loanDate.toISOString(),
            installmentCount: installmentCandidate.loan._count.installments,
          },
          installment: {
            amount: installmentCandidate.amount,
            dueDate: installmentCandidate.dueDate.toISOString(),
            paidAt: null,
          },
          user: {
            name: '',
            email: '',
            temporaryPassword: '',
          },
        },
      });

      if (dispatchResult.queuedChannelCount <= 0) {
        console.info('Skipping reminder timestamp update because no channels were queued', {
          event,
          loanId: installmentCandidate.loanId,
          installmentId: installmentCandidate.id,
          matchedConfigCount: dispatchResult.matchedConfigCount,
        });
        continue;
      }

      await prisma.loanInstallment.update({
        where: { id: installmentCandidate.id },
        data: reminderTimestampField === 'dueReminderSentAt'
          ? { dueReminderSentAt: reminderTimestamp }
          : { overdueReminderSentAt: reminderTimestamp },
      });
    } catch (error) {
      console.error('Failed to process installment reminder candidate', {
        event,
        loanId: installmentCandidate.loanId,
        installmentId: installmentCandidate.id,
        error: getErrorMessage(error),
      });
    }
  }
}

export async function processInstallmentOverdueStatusSchedule(
  env: NotificationEnv,
  scheduledTime: number | Date,
) {
  const prisma = initializePrisma(env);
  const overdueDateRange = getManilaDayRange(new Date(scheduledTime));
  const overdueInstallments = await prisma.loanInstallment.findMany({
    where: {
      paidAt: null,
      status: {
        notIn: [InstallmentStatus.PAID, InstallmentStatus.OVERDUE],
      },
      dueDate: {
        lt: overdueDateRange.start,
      },
    },
    select: {
      id: true,
      loanId: true,
      status: true,
    },
    orderBy: [
      { dueDate: 'asc' },
      { id: 'asc' },
    ],
  });

  for (const overdueInstallment of overdueInstallments) {
    try {
      await prisma.loanInstallment.update({
        where: { id: overdueInstallment.id },
        data: { status: InstallmentStatus.OVERDUE },
      });

      await createLoanLog(prisma, {
        loanId: overdueInstallment.loanId,
        installmentId: overdueInstallment.id,
        actorUserId: null,
        eventType: LoanLogEventType.INSTALLMENT_UPDATED,
        eventData: {
          source: 'scheduled-overdue-status-sync',
          changes: {
            status: {
              from: overdueInstallment.status,
              to: InstallmentStatus.OVERDUE,
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to mark installment as overdue', {
        loanId: overdueInstallment.loanId,
        installmentId: overdueInstallment.id,
        error: getErrorMessage(error),
      });
    }
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
