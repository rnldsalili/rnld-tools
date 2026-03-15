import type { LoanDocumentLogActorType, LoanDocumentLogEventType } from '@workspace/constants';
import type { Context } from 'hono';
import type { AppBindings } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';

type LoanDocumentLogEventData = Record<string, unknown> | null | undefined;

type LoanDocumentLogContext = Context<AppBindings>;

export function getLoanDocumentRequestMetadata(c: LoanDocumentLogContext) {
  return {
    ipAddress: c.req.header('cf-connecting-ip') ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  };
}

export function serializeLoanDocumentLogEventData(eventData: LoanDocumentLogEventData): string | null {
  if (!eventData) return null;
  return JSON.stringify(eventData);
}

export function parseLoanDocumentLogEventData(eventData: string | null): Record<string, unknown> | null {
  if (!eventData) return null;

  try {
    const parsedValue = JSON.parse(eventData);
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function logLoanDocumentEvent(c: LoanDocumentLogContext, params: {
  loanId: string;
  templateId: string;
  loanDocumentId?: string | null;
  token?: string | null;
  eventType: LoanDocumentLogEventType;
  actorType: LoanDocumentLogActorType;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  eventData?: LoanDocumentLogEventData;
}) {
  const prisma = initializePrisma(c.env);

  await prisma.loanDocumentLog.create({
    data: {
      loanId: params.loanId,
      templateId: params.templateId,
      loanDocumentId: params.loanDocumentId ?? null,
      token: params.token ?? null,
      eventType: params.eventType,
      actorType: params.actorType,
      actorUserId: params.actorUserId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      eventData: serializeLoanDocumentLogEventData(params.eventData),
    },
  });
}

export async function logLoanDocumentEventSafely(c: LoanDocumentLogContext, params: {
  loanId: string;
  templateId: string;
  loanDocumentId?: string | null;
  token?: string | null;
  eventType: LoanDocumentLogEventType;
  actorType: LoanDocumentLogActorType;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  eventData?: LoanDocumentLogEventData;
}) {
  try {
    await logLoanDocumentEvent(c, params);
  } catch (logError) {
    console.error('Failed to persist loan document log', logError);
  }
}

export async function getLoanDocumentLogContextByToken(c: LoanDocumentLogContext, token: string) {
  const prisma = initializePrisma(c.env);

  return prisma.loanDocumentLog.findFirst({
    where: { token },
    orderBy: { createdAt: 'desc' },
    select: {
      loanId: true,
      templateId: true,
      loanDocumentId: true,
    },
  });
}
