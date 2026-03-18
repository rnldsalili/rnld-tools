import {
  NotificationChannel,
  NotificationLogStatus,
} from '@workspace/constants';
import type {
  NotificationEmailProvider,
  NotificationEvent,
  NotificationSmsProvider,
} from '@workspace/constants';
import type { NotificationEnv } from './types';
import { initializePrisma } from '@/api/lib/db';

export const NOTIFICATION_QUEUE_MAX_RETRIES = 3;
export const NOTIFICATION_QUEUE_TOTAL_ATTEMPTS = NOTIFICATION_QUEUE_MAX_RETRIES + 1;

interface NotificationLogBaseInput {
  event?: NotificationEvent | null;
  queuedAt: string;
  queuedByUserId: string | null;
  isTestSend: boolean;
}

interface EmailNotificationLogInput extends NotificationLogBaseInput {
  channel: NotificationChannel.EMAIL;
  provider: NotificationEmailProvider;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  messageContent: string;
}

interface SmsNotificationLogInput extends NotificationLogBaseInput {
  channel: NotificationChannel.SMS;
  provider: NotificationSmsProvider;
  recipientPhone: string;
  messageContent: string;
}

export async function createNotificationLog(
  env: NotificationEnv,
  notificationLogInput: EmailNotificationLogInput | SmsNotificationLogInput,
) {
  const prisma = initializePrisma(env);

  return prisma.notificationLog.create({
    data: {
      channel: notificationLogInput.channel,
      event: notificationLogInput.event ?? null,
      status: NotificationLogStatus.QUEUED,
      isTestSend: notificationLogInput.isTestSend,
      emailProvider: notificationLogInput.channel === NotificationChannel.EMAIL
        ? notificationLogInput.provider
        : null,
      smsProvider: notificationLogInput.channel === NotificationChannel.SMS
        ? notificationLogInput.provider
        : null,
      recipientEmail: notificationLogInput.channel === NotificationChannel.EMAIL
        ? notificationLogInput.recipientEmail
        : null,
      recipientName: notificationLogInput.channel === NotificationChannel.EMAIL
        ? notificationLogInput.recipientName?.trim() || null
        : null,
      recipientPhone: notificationLogInput.channel === NotificationChannel.SMS
        ? notificationLogInput.recipientPhone
        : null,
      subject: notificationLogInput.channel === NotificationChannel.EMAIL
        ? notificationLogInput.subject
        : null,
      messageContent: notificationLogInput.messageContent,
      queuedAt: new Date(notificationLogInput.queuedAt),
      queuedByUserId: notificationLogInput.queuedByUserId,
    },
  });
}

export async function markNotificationLogQueueFailed(
  env: NotificationEnv,
  params: {
    notificationLogId: string;
    errorMessage: string;
  },
) {
  const prisma = initializePrisma(env);

  await prisma.notificationLog.update({
    where: { id: params.notificationLogId },
    data: {
      status: NotificationLogStatus.FAILED,
      lastErrorMessage: params.errorMessage,
      failedAt: new Date(),
    },
  });
}

export async function markNotificationLogProcessing(
  env: NotificationEnv,
  params: {
    notificationLogId: string;
    attemptCount: number;
  },
) {
  const prisma = initializePrisma(env);

  await prisma.notificationLog.update({
    where: { id: params.notificationLogId },
    data: {
      status: params.attemptCount > 1
        ? NotificationLogStatus.RETRYING
        : NotificationLogStatus.PROCESSING,
      attemptCount: params.attemptCount,
      lastAttemptAt: new Date(),
    },
  });
}

export async function markNotificationLogSent(
  env: NotificationEnv,
  params: {
    notificationLogId: string;
    attemptCount: number;
  },
) {
  const prisma = initializePrisma(env);

  await prisma.notificationLog.update({
    where: { id: params.notificationLogId },
    data: {
      status: NotificationLogStatus.SENT,
      attemptCount: params.attemptCount,
      lastErrorMessage: null,
      sentAt: new Date(),
    },
  });
}

export async function markNotificationLogRetrying(
  env: NotificationEnv,
  params: {
    notificationLogId: string;
    attemptCount: number;
    errorMessage: string;
  },
) {
  const prisma = initializePrisma(env);

  await prisma.notificationLog.update({
    where: { id: params.notificationLogId },
    data: {
      status: NotificationLogStatus.RETRYING,
      attemptCount: params.attemptCount,
      lastErrorMessage: params.errorMessage,
    },
  });
}

export async function markNotificationLogFailed(
  env: NotificationEnv,
  params: {
    notificationLogId: string;
    attemptCount: number;
    errorMessage: string;
  },
) {
  const prisma = initializePrisma(env);

  await prisma.notificationLog.update({
    where: { id: params.notificationLogId },
    data: {
      status: NotificationLogStatus.FAILED,
      attemptCount: params.attemptCount,
      lastErrorMessage: params.errorMessage,
      failedAt: new Date(),
    },
  });
}

export function isFinalNotificationAttempt(attemptCount: number) {
  return attemptCount >= NOTIFICATION_QUEUE_TOTAL_ATTEMPTS;
}
