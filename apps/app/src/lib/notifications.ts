import {
  NotificationEmailProvider,
  NotificationSmsProvider,
} from '@workspace/constants';

export const DEFAULT_SMS_NOTIFICATION_PROVIDER = NotificationSmsProvider.PHILSMS;

export function createEmptyNotificationProviderStatus() {
  return {
    email: {
      [NotificationEmailProvider.BREVO]: { configured: false, missing: [] },
    },
    sms: {
      [NotificationSmsProvider.PHILSMS]: { configured: false, missing: [] },
      [NotificationSmsProvider.SEMAPHORE]: { configured: false, missing: [] },
    },
  };
}
