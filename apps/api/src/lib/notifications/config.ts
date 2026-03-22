import {
  NotificationEmailProvider,
  NotificationSmsProvider,
} from '@workspace/constants';
import type { NotificationProviderStatus } from './types';

export const NOTIFICATIONS_EMAIL_QUEUE_NAME = 'notifications-email';
export const NOTIFICATIONS_SMS_QUEUE_NAME = 'notifications-sms';

export function getEmailProviderStatus(env: CloudflareBindings): Record<NotificationEmailProvider, NotificationProviderStatus> {
  const brevoMissing = [
    !getOptionalBindingString(env, 'BREVO_API_KEY') ? 'BREVO_API_KEY' : null,
    !getOptionalBindingString(env, 'BREVO_SENDER_EMAIL') ? 'BREVO_SENDER_EMAIL' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    [NotificationEmailProvider.BREVO]: {
      configured: brevoMissing.length === 0,
      missing: brevoMissing,
    },
  };
}

export function getSmsProviderStatus(env: CloudflareBindings): Record<NotificationSmsProvider, NotificationProviderStatus> {
  const httpSmsMissing = [
    !getOptionalBindingString(env, 'HTTPSMS_API_KEY') ? 'HTTPSMS_API_KEY' : null,
    !getOptionalBindingString(env, 'HTTPSMS_FROM') ? 'HTTPSMS_FROM' : null,
  ].filter((value): value is string => Boolean(value));
  const philsmsMissing = [
    !getOptionalBindingString(env, 'PHILSMS_API_TOKEN') ? 'PHILSMS_API_TOKEN' : null,
    !getOptionalBindingString(env, 'PHILSMS_SENDER_ID') ? 'PHILSMS_SENDER_ID' : null,
  ].filter((value): value is string => Boolean(value));
  const semaphoreMissing = [
    !getOptionalBindingString(env, 'SEMAPHORE_API_KEY') ? 'SEMAPHORE_API_KEY' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    [NotificationSmsProvider.HTTPSMS]: {
      configured: httpSmsMissing.length === 0,
      missing: httpSmsMissing,
    },
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

function getOptionalBindingString(env: CloudflareBindings, key: string) {
  const value = Reflect.get(env, key);
  return typeof value === 'string' && value.trim() ? value : undefined;
}
