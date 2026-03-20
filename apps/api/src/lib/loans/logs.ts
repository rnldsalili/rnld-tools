import type { LoanLogEventType } from '@workspace/constants';
import type { Prisma } from '@/prisma/client';

type LoanLogEventData = Record<string, unknown> | null | undefined;
type LoanLogWriter = {
  loanLog: {
    create: (args: {
      data: {
        actorUserId: string | null;
        eventData: string | null;
        eventType: LoanLogEventType;
        installmentId: string | null;
        loanId: string;
        paymentId: string | null;
      };
    }) => Prisma.PrismaPromise<unknown>;
  };
};

export function serializeLoanLogEventData(eventData: LoanLogEventData): string | null {
  if (!eventData) return null;
  return JSON.stringify(eventData);
}

export function parseLoanLogEventData(eventData: string | null): Record<string, unknown> | null {
  if (!eventData) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(eventData);
    return isPlainRecord(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function createLoanLog(prisma: LoanLogWriter, params: {
  actorUserId?: string | null;
  eventData?: LoanLogEventData;
  eventType: LoanLogEventType;
  installmentId?: string | null;
  loanId: string;
  paymentId?: string | null;
}) {
  return prisma.loanLog.create({
    data: {
      loanId: params.loanId,
      installmentId: params.installmentId ?? null,
      paymentId: params.paymentId ?? null,
      eventType: params.eventType,
      actorUserId: params.actorUserId ?? null,
      eventData: serializeLoanLogEventData(params.eventData),
    },
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
