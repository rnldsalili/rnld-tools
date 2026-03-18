import {
  NotificationEmailProvider,
  NotificationSmsProvider,
} from '@workspace/constants';
import type { NotificationEnv, NotificationProviderStatus } from './types';

export const NOTIFICATIONS_EMAIL_QUEUE_NAME = 'notifications-email';
export const NOTIFICATIONS_SMS_QUEUE_NAME = 'notifications-sms';

export function getEmailProviderStatus(env: NotificationEnv): Record<NotificationEmailProvider, NotificationProviderStatus> {
  const brevoMissing = [
    !env.BREVO_API_KEY ? 'BREVO_API_KEY' : null,
    !env.BREVO_SENDER_EMAIL ? 'BREVO_SENDER_EMAIL' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    [NotificationEmailProvider.BREVO]: {
      configured: brevoMissing.length === 0,
      missing: brevoMissing,
    },
  };
}

export function getSmsProviderStatus(env: NotificationEnv): Record<NotificationSmsProvider, NotificationProviderStatus> {
  const philsmsMissing = [
    !env.PHILSMS_API_TOKEN ? 'PHILSMS_API_TOKEN' : null,
    !env.PHILSMS_SENDER_ID ? 'PHILSMS_SENDER_ID' : null,
  ].filter((value): value is string => Boolean(value));
  const semaphoreMissing = [
    !env.SEMAPHORE_API_KEY ? 'SEMAPHORE_API_KEY' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    [NotificationSmsProvider.PHILSMS]: {
      configured: philsmsMissing.length === 0,
      missing: philsmsMissing,
    },
    [NotificationSmsProvider.SEMAPHORE]: {
      configured: semaphoreMissing.length === 0,
      missing: semaphoreMissing,
    },
  };
}
