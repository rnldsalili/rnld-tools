import {
  NotificationChannel,
} from '@workspace/constants';
import { getEmailProviderStatus, getSmsProviderStatus } from './config';
import {
  createNotificationLog,
  markNotificationLogQueueFailed,
} from './logs';
import { getNotificationSiteUrl } from './placeholders';
import {
  enqueueEmailNotificationJob,
  enqueueSmsNotificationJob,
} from './queue';
import {
  getNotificationContentFormat,
  parseNotificationTemplateContent,
  renderEmailTemplate,
  renderSmsTemplate,
} from './renderer';
import type {
  LoanDocumentPdfAttachmentSource,
  NotificationEmailAttachment,
  NotificationEnv,
} from './types';
import type {
  NotificationEmailProvider,
  NotificationEvent,
  NotificationSmsProvider,
} from '@workspace/constants';
import type { NotificationTemplateSampleContext } from './placeholders';
import type { Prisma, PrismaClient } from '@/prisma/client';

interface DispatchEventNotificationsParams {
  env: NotificationEnv;
  prisma: PrismaClient;
  event: NotificationEvent;
  queuedByUserId: string | null;
  context: NotificationTemplateSampleContext;
  emailAttachments?: Array<NotificationEmailAttachment>;
  emailAttachmentSources?: Array<LoanDocumentPdfAttachmentSource>;
  notificationsEnabled?: boolean;
}

export interface DispatchEventNotificationsResult {
  matchedConfigCount: number;
  queuedChannelCount: number;
}

type NotificationEventConfigWithTemplate = Prisma.NotificationEventConfigGetPayload<{
  include: { template: true };
}>;

export async function dispatchEventNotifications({
  env,
  prisma,
  event,
  queuedByUserId,
  context,
  emailAttachments,
  emailAttachmentSources,
  notificationsEnabled = true,
}: DispatchEventNotificationsParams): Promise<DispatchEventNotificationsResult> {
  if (!notificationsEnabled) {
    console.info('Skipping event notification because notifications are disabled for this loan', {
      event,
    });
    return {
      matchedConfigCount: 0,
      queuedChannelCount: 0,
    };
  }

  try {
    const notificationEventConfigs = await prisma.notificationEventConfig.findMany({
      where: {
        event,
        isEnabled: true,
      },
      include: {
        template: true,
      },
      orderBy: {
        channel: 'asc',
      },
    });

    if (notificationEventConfigs.length === 0) {
      return {
        matchedConfigCount: 0,
        queuedChannelCount: 0,
      };
    }

    let queuedChannelCount = 0;

    for (const notificationEventConfig of notificationEventConfigs) {
      try {
        if (notificationEventConfig.channel === NotificationChannel.EMAIL) {
          const emailQueued = await dispatchEmailEventNotification({
            env,
            event,
            queuedByUserId,
            context,
            emailAttachments,
            emailAttachmentSources,
            notificationEventConfig,
          });
          if (emailQueued) {
            queuedChannelCount += 1;
          }
          continue;
        }

        const smsQueued = await dispatchSmsEventNotification({
          env,
          event,
          queuedByUserId,
          context,
          notificationEventConfig,
        });
        if (smsQueued) {
          queuedChannelCount += 1;
        }
      } catch (error) {
        console.error('Failed to dispatch event notification', {
          event,
          channel: notificationEventConfig.channel,
          error: getErrorMessage(error),
        });
      }
    }

    return {
      matchedConfigCount: notificationEventConfigs.length,
      queuedChannelCount,
    };
  } catch (error) {
    console.error('Failed to load notification event configs', {
      event,
      error: getErrorMessage(error),
    });
    return {
      matchedConfigCount: 0,
      queuedChannelCount: 0,
    };
  }
}

async function dispatchEmailEventNotification(params: {
  env: NotificationEnv;
  event: NotificationEvent;
  queuedByUserId: string | null;
  context: NotificationTemplateSampleContext;
  emailAttachments?: Array<NotificationEmailAttachment>;
  emailAttachmentSources?: Array<LoanDocumentPdfAttachmentSource>;
  notificationEventConfig: NotificationEventConfigWithTemplate;
}): Promise<boolean> {
  const {
    env,
    event,
    queuedByUserId,
    context,
    emailAttachments,
    emailAttachmentSources,
    notificationEventConfig,
  } = params;

  if (!notificationEventConfig.emailProvider) {
    console.warn('Skipping event email notification because no provider is configured', {
      event,
      channel: notificationEventConfig.channel,
    });
    return false;
  }

  const notificationEmailProvider = notificationEventConfig.emailProvider as NotificationEmailProvider;

  const recipientEmail = context.client.email.trim();
  if (!recipientEmail) {
    console.warn('Skipping event email notification because the client email is missing', {
      event,
      channel: notificationEventConfig.channel,
    });
    return false;
  }

  const providerStatus = getEmailProviderStatus(env)[notificationEmailProvider];
  if (!providerStatus.configured) {
    console.warn('Skipping event email notification because the configured provider is unavailable', {
      event,
      channel: notificationEventConfig.channel,
      provider: notificationEmailProvider,
      missing: providerStatus.missing,
    });
    return false;
  }

  const renderedEmail = renderEmailTemplate({
    event,
    subject: notificationEventConfig.template.subject ?? notificationEventConfig.template.name,
    content: parseNotificationTemplateContent(
      getNotificationContentFormat(notificationEventConfig.template.contentFormat),
      notificationEventConfig.template.content,
    ),
    siteUrl: getNotificationSiteUrl(env),
    context,
  });
  const notificationLog = await createNotificationLog(env, {
    channel: NotificationChannel.EMAIL,
    event,
    provider: notificationEmailProvider,
    recipientEmail,
    recipientName: context.client.name.trim() || null,
    subject: renderedEmail.subject,
    messageContent: renderedEmail.html,
    queuedAt: new Date().toISOString(),
    queuedByUserId,
    isTestSend: false,
  });

  try {
    await enqueueEmailNotificationJob(env, {
      notificationLogId: notificationLog.id,
      channel: NotificationChannel.EMAIL,
      provider: notificationEmailProvider,
      recipient: {
        email: recipientEmail,
        name: context.client.name.trim() || null,
      },
      subject: renderedEmail.subject,
      html: renderedEmail.html,
      attachments: emailAttachments,
      attachmentSources: emailAttachmentSources,
      trace: {
        event,
        queuedAt: notificationLog.queuedAt.toISOString(),
        queuedByUserId,
        testSend: false,
      },
    });
    return true;
  } catch (error) {
    await markNotificationLogQueueFailed(env, {
      notificationLogId: notificationLog.id,
      errorMessage: getErrorMessage(error),
    });
    throw error;
  }
}

async function dispatchSmsEventNotification(params: {
  env: NotificationEnv;
  event: NotificationEvent;
  queuedByUserId: string | null;
  context: NotificationTemplateSampleContext;
  notificationEventConfig: NotificationEventConfigWithTemplate;
}): Promise<boolean> {
  const { env, event, queuedByUserId, context, notificationEventConfig } = params;

  if (!notificationEventConfig.smsProvider) {
    console.warn('Skipping event SMS notification because no provider is configured', {
      event,
      channel: notificationEventConfig.channel,
    });
    return false;
  }

  const notificationSmsProvider = notificationEventConfig.smsProvider as NotificationSmsProvider;

  const recipientPhone = context.client.phone.trim();
  if (!recipientPhone) {
    console.warn('Skipping event SMS notification because the client phone is missing', {
      event,
      channel: notificationEventConfig.channel,
    });
    return false;
  }

  const providerStatus = getSmsProviderStatus(env)[notificationSmsProvider];
  if (!providerStatus.configured) {
    console.warn('Skipping event SMS notification because the configured provider is unavailable', {
      event,
      channel: notificationEventConfig.channel,
      provider: notificationSmsProvider,
      missing: providerStatus.missing,
    });
    return false;
  }

  const renderedSms = renderSmsTemplate({
    event,
    content: String(parseNotificationTemplateContent(
      getNotificationContentFormat(notificationEventConfig.template.contentFormat),
      notificationEventConfig.template.content,
    )),
    siteUrl: getNotificationSiteUrl(env),
    context,
  });
  const notificationLog = await createNotificationLog(env, {
    channel: NotificationChannel.SMS,
    event,
    provider: notificationSmsProvider,
    recipientPhone,
    messageContent: renderedSms.text,
    queuedAt: new Date().toISOString(),
    queuedByUserId,
    isTestSend: false,
  });

  try {
    await enqueueSmsNotificationJob(env, {
      notificationLogId: notificationLog.id,
      channel: NotificationChannel.SMS,
      provider: notificationSmsProvider,
      recipient: {
        phone: recipientPhone,
      },
      text: renderedSms.text,
      trace: {
        event,
        queuedAt: notificationLog.queuedAt.toISOString(),
        queuedByUserId,
        testSend: false,
      },
    });
    return true;
  } catch (error) {
    await markNotificationLogQueueFailed(env, {
      notificationLogId: notificationLog.id,
      errorMessage: getErrorMessage(error),
    });
    throw error;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
