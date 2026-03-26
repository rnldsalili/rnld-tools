import { getEmailProviderClient } from './email';
import {
  NOTIFICATIONS_EMAIL_QUEUE_NAME,
  NOTIFICATIONS_SMS_QUEUE_NAME,
} from './config';
import {
  isFinalNotificationAttempt,
  markNotificationLogFailed,
  markNotificationLogProcessing,
  markNotificationLogRetrying,
  markNotificationLogSent,
} from './logs';
import { getSmsProviderClient } from './sms';
import type {
  EmailNotificationJob,
  NotificationBindings,
  NotificationEnv,
  SmsNotificationJob,
} from './types';
import { generateLoanDocumentPdf } from '@/api/lib/documents/pdf';
import { initializePrisma } from '@/api/lib/db';

export async function enqueueEmailNotificationJob(
  env: NotificationBindings,
  job: EmailNotificationJob,
) {
  await env.NOTIFICATIONS_EMAIL_QUEUE.send(job, { contentType: 'json' });
}

export async function enqueueSmsNotificationJob(
  env: NotificationBindings,
  job: SmsNotificationJob,
) {
  await env.NOTIFICATIONS_SMS_QUEUE.send(job, { contentType: 'json' });
}

export async function processNotificationQueueBatch(
  batch: MessageBatch<unknown>,
  env: NotificationEnv,
) {
  if (isEmailNotificationBatch(batch)) {
    await processEmailBatch(batch, env);
    return;
  }

  if (isSmsNotificationBatch(batch)) {
    await processSmsBatch(batch, env);
    return;
  }

  console.warn(`Unhandled notification queue: ${batch.queue}`);
}

async function processEmailBatch(
  batch: MessageBatch<EmailNotificationJob>,
  env: NotificationEnv,
) {
  for (const message of batch.messages) {
    await markNotificationLogProcessingSafely(env, message.body.notificationLogId, message.attempts);

    try {
      const resolvedEmailJob = await resolveEmailNotificationJobAttachments(env, message.body);
      await getEmailProviderClient(resolvedEmailJob.provider).send(resolvedEmailJob, env);
      await markNotificationLogSentSafely(env, message.body.notificationLogId, message.attempts);
      message.ack();
    } catch (error) {
      const errorMessage = getNotificationErrorMessage(error);
      const isFinalAttempt = isFinalNotificationAttempt(message.attempts);

      console.error('Failed to process email notification message', {
        messageId: message.id,
        attempts: message.attempts,
        error: errorMessage,
      });

      if (isFinalAttempt) {
        await markNotificationLogFailedSafely(env, message.body.notificationLogId, message.attempts, errorMessage);
        message.ack();
        continue;
      }

      await markNotificationLogRetryingSafely(env, message.body.notificationLogId, message.attempts, errorMessage);
      message.retry();
    }
  }
}

async function resolveEmailNotificationJobAttachments(
  env: NotificationEnv,
  job: EmailNotificationJob,
): Promise<EmailNotificationJob> {
  if (!job.attachmentSources || job.attachmentSources.length === 0) {
    return job;
  }

  const prisma = initializePrisma(env);
  const resolvedAttachments = await Promise.all(job.attachmentSources.map(async (attachmentSource) => {
    const generatedLoanDocumentPdf = await generateLoanDocumentPdf(env, prisma, {
      loanId: attachmentSource.loanId,
      templateId: attachmentSource.templateId,
    });

    return {
      contentBase64: Buffer.from(generatedLoanDocumentPdf.pdfBytes).toString('base64'),
      name: generatedLoanDocumentPdf.fileName,
    };
  }));

  return {
    ...job,
    attachments: [...(job.attachments ?? []), ...resolvedAttachments],
    attachmentSources: undefined,
  };
}

async function processSmsBatch(
  batch: MessageBatch<SmsNotificationJob>,
  env: NotificationEnv,
) {
  for (const message of batch.messages) {
    await markNotificationLogProcessingSafely(env, message.body.notificationLogId, message.attempts);

    try {
      await getSmsProviderClient(message.body.provider).send(message.body, env);
      await markNotificationLogSentSafely(env, message.body.notificationLogId, message.attempts);
      message.ack();
    } catch (error) {
      const errorMessage = getNotificationErrorMessage(error);
      const isFinalAttempt = isFinalNotificationAttempt(message.attempts);

      console.error('Failed to process SMS notification message', {
        messageId: message.id,
        attempts: message.attempts,
        error: errorMessage,
      });

      if (isFinalAttempt) {
        await markNotificationLogFailedSafely(env, message.body.notificationLogId, message.attempts, errorMessage);
        message.ack();
        continue;
      }

      await markNotificationLogRetryingSafely(env, message.body.notificationLogId, message.attempts, errorMessage);
      message.retry();
    }
  }
}

async function markNotificationLogProcessingSafely(
  env: NotificationEnv,
  notificationLogId: string,
  attemptCount: number,
) {
  try {
    await markNotificationLogProcessing(env, { notificationLogId, attemptCount });
  } catch (error) {
    console.error('Failed to update notification log before delivery', {
      notificationLogId,
      attemptCount,
      error: getNotificationErrorMessage(error),
    });
  }
}

async function markNotificationLogSentSafely(
  env: NotificationEnv,
  notificationLogId: string,
  attemptCount: number,
) {
  try {
    await markNotificationLogSent(env, { notificationLogId, attemptCount });
  } catch (error) {
    console.error('Failed to mark notification log as sent', {
      notificationLogId,
      attemptCount,
      error: getNotificationErrorMessage(error),
    });
  }
}

async function markNotificationLogRetryingSafely(
  env: NotificationEnv,
  notificationLogId: string,
  attemptCount: number,
  errorMessage: string,
) {
  try {
    await markNotificationLogRetrying(env, {
      notificationLogId,
      attemptCount,
      errorMessage,
    });
  } catch (error) {
    console.error('Failed to mark notification log as retrying', {
      notificationLogId,
      attemptCount,
      errorMessage,
      updateError: getNotificationErrorMessage(error),
    });
  }
}

async function markNotificationLogFailedSafely(
  env: NotificationEnv,
  notificationLogId: string,
  attemptCount: number,
  errorMessage: string,
) {
  try {
    await markNotificationLogFailed(env, {
      notificationLogId,
      attemptCount,
      errorMessage,
    });
  } catch (error) {
    console.error('Failed to mark notification log as failed', {
      notificationLogId,
      attemptCount,
      errorMessage,
      updateError: getNotificationErrorMessage(error),
    });
  }
}

function getNotificationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isEmailNotificationBatch(batch: MessageBatch<unknown>): batch is MessageBatch<EmailNotificationJob> {
  return batch.queue === NOTIFICATIONS_EMAIL_QUEUE_NAME;
}

function isSmsNotificationBatch(batch: MessageBatch<unknown>): batch is MessageBatch<SmsNotificationJob> {
  return batch.queue === NOTIFICATIONS_SMS_QUEUE_NAME;
}
