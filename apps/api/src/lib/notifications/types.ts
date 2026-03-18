import type {
  NotificationChannel,
  NotificationEmailProvider,
  NotificationEvent,
  NotificationSmsProvider,
} from '@workspace/constants';

export interface NotificationJobTrace {
  event: NotificationEvent;
  queuedAt: string;
  queuedByUserId: string | null;
  testSend: boolean;
}

export interface EmailNotificationJob {
  notificationLogId: string;
  channel: NotificationChannel.EMAIL;
  provider: NotificationEmailProvider;
  recipient: {
    email: string;
    name?: string | null;
  };
  subject: string;
  html: string;
  trace: NotificationJobTrace;
}

export interface SmsNotificationJob {
  notificationLogId: string;
  channel: NotificationChannel.SMS;
  provider: NotificationSmsProvider;
  recipient: {
    phone: string;
  };
  text: string;
  trace: NotificationJobTrace;
}

export interface NotificationBindings {
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  PHILSMS_API_TOKEN?: string;
  PHILSMS_SENDER_ID?: string;
  SEMAPHORE_API_KEY?: string;
  SEMAPHORE_SENDER_NAME?: string;
  NOTIFICATIONS_EMAIL_QUEUE: Queue<EmailNotificationJob>;
  NOTIFICATIONS_SMS_QUEUE: Queue<SmsNotificationJob>;
}

export type NotificationEnv = CloudflareBindings & NotificationBindings;

export interface NotificationProviderStatus {
  configured: boolean;
  missing: Array<string>;
}

export interface EmailProviderClient {
  send: (job: EmailNotificationJob, env: NotificationEnv) => Promise<void>;
}

export interface SmsProviderClient {
  send: (job: SmsNotificationJob, env: NotificationEnv) => Promise<void>;
}
