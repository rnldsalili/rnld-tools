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
  NotificationEmailProvider,
  NotificationEvent,
  NotificationSmsProvider,
} from '@workspace/constants';
import type { NotificationTemplateSampleContext } from './placeholders';
import type { NotificationEnv } from './types';
import type { Prisma, PrismaClient } from '@/prisma/client';

interface DispatchEventNotificationsParams {
  env: NotificationEnv;
  prisma: PrismaClient;
  event: NotificationEvent;
  queuedByUserId: string | null;
  context: NotificationTemplateSampleContext;
  notificationsEnabled?: boolean;
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
  notificationsEnabled = true,
}: DispatchEventNotificationsParams) {
  if (!notificationsEnabled) {
    console.info('Skipping event notification because notifications are disabled for this loan', {
      event,
    });
    return;
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
      return;
    }

    for (const notificationEventConfig of notificationEventConfigs) {
      try {
        if (notificationEventConfig.channel === NotificationChannel.EMAIL) {
          await dispatchEmailEventNotification({
            env,
            event,
            queuedByUserId,
            context,
            notificationEventConfig,
          });
          continue;
        }

        await dispatchSmsEventNotification({
          env,
          event,
          queuedByUserId,
          context,
          notificationEventConfig,
        });
      } catch (error) {
        console.error('Failed to dispatch event notification', {
          event,
          channel: notificationEventConfig.channel,
          error: getErrorMessage(error),
        });
      }
    }
  } catch (error) {
    console.error('Failed to load notification event configs', {
      event,
      error: getErrorMessage(error),
    });
  }
}

async function dispatchEmailEventNotification(params: {
  env: NotificationEnv;
  event: NotificationEvent;
  queuedByUserId: string | null;
  context: NotificationTemplateSampleContext;
  notificationEventConfig: NotificationEventConfigWithTemplate;
}) {
  const { env, event, queuedByUserId, context, notificationEventConfig } = params;

  if (!notificationEventConfig.emailProvider) {
    console.warn('Skipping event email notification because no provider is configured', {
      event,
      channel: notificationEventConfig.channel,
    });
    return;
  }

  const notificationEmailProvider = notificationEventConfig.emailProvider as NotificationEmailProvider;

  const recipientEmail = context.client.email.trim();
  if (!recipientEmail) {
    console.warn('Skipping event email notification because the client email is missing', {
      event,
      channel: notificationEventConfig.channel,
    });
    return;
  }

  const providerStatus = getEmailProviderStatus(env)[notificationEmailProvider];
  if (!providerStatus.configured) {
    console.warn('Skipping event email notification because the configured provider is unavailable', {
      event,
      channel: notificationEventConfig.channel,
      provider: notificationEmailProvider,
      missing: providerStatus.missing,
    });
    return;
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
      trace: {
        event,
        queuedAt: notificationLog.queuedAt.toISOString(),
        queuedByUserId,
        testSend: false,
      },
    });
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
}) {
  const { env, event, queuedByUserId, context, notificationEventConfig } = params;

  if (!notificationEventConfig.smsProvider) {
    console.warn('Skipping event SMS notification because no provider is configured', {
      event,
      channel: notificationEventConfig.channel,
    });
    return;
  }

  const notificationSmsProvider = notificationEventConfig.smsProvider as NotificationSmsProvider;

  const recipientPhone = context.client.phone.trim();
  if (!recipientPhone) {
    console.warn('Skipping event SMS notification because the client phone is missing', {
      event,
      channel: notificationEventConfig.channel,
    });
    return;
  }

  const providerStatus = getSmsProviderStatus(env)[notificationSmsProvider];
  if (!providerStatus.configured) {
    console.warn('Skipping event SMS notification because the configured provider is unavailable', {
      event,
      channel: notificationEventConfig.channel,
      provider: notificationSmsProvider,
      missing: providerStatus.missing,
    });
    return;
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
