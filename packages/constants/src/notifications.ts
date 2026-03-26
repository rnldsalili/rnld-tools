export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export const NOTIFICATION_CHANNELS = [
  NotificationChannel.EMAIL,
  NotificationChannel.SMS,
] as const;

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.SMS]: 'SMS',
};

export enum NotificationEmailProvider {
  BREVO = 'BREVO',
}

export const NOTIFICATION_EMAIL_PROVIDERS = [
  NotificationEmailProvider.BREVO,
] as const;

export const NOTIFICATION_EMAIL_PROVIDER_LABELS: Record<NotificationEmailProvider, string> = {
  [NotificationEmailProvider.BREVO]: 'Brevo',
};

export enum NotificationSmsProvider {
  HTTPSMS = 'HTTPSMS',
  PHILSMS = 'PHILSMS',
  SEMAPHORE = 'SEMAPHORE',
}

export const NOTIFICATION_SMS_PROVIDERS = [
  NotificationSmsProvider.HTTPSMS,
  NotificationSmsProvider.PHILSMS,
  NotificationSmsProvider.SEMAPHORE,
] as const;

export const NOTIFICATION_SMS_PROVIDER_LABELS: Record<NotificationSmsProvider, string> = {
  [NotificationSmsProvider.HTTPSMS]: 'httpSMS',
  [NotificationSmsProvider.PHILSMS]: 'PhilSMS',
  [NotificationSmsProvider.SEMAPHORE]: 'Semaphore',
};

export enum NotificationEvent {
  LOAN_CREATED = 'LOAN_CREATED',
  DOCUMENT_SIGNATURE_REQUESTED = 'DOCUMENT_SIGNATURE_REQUESTED',
  DOCUMENT_SIGNED = 'DOCUMENT_SIGNED',
  INSTALLMENT_DUE_REMINDER = 'INSTALLMENT_DUE_REMINDER',
  INSTALLMENT_OVERDUE_REMINDER = 'INSTALLMENT_OVERDUE_REMINDER',
  INSTALLMENT_PAID = 'INSTALLMENT_PAID',
  USER_ACCOUNT_CREATED = 'USER_ACCOUNT_CREATED',
}

export const NOTIFICATION_EVENTS = [
  NotificationEvent.LOAN_CREATED,
  NotificationEvent.DOCUMENT_SIGNATURE_REQUESTED,
  NotificationEvent.DOCUMENT_SIGNED,
  NotificationEvent.INSTALLMENT_DUE_REMINDER,
  NotificationEvent.INSTALLMENT_OVERDUE_REMINDER,
  NotificationEvent.INSTALLMENT_PAID,
  NotificationEvent.USER_ACCOUNT_CREATED,
] as const;

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  [NotificationEvent.LOAN_CREATED]: 'Loan Created',
  [NotificationEvent.DOCUMENT_SIGNATURE_REQUESTED]: 'Document Signature Requested',
  [NotificationEvent.DOCUMENT_SIGNED]: 'Document Signed',
  [NotificationEvent.INSTALLMENT_DUE_REMINDER]: 'Installment Due Reminder',
  [NotificationEvent.INSTALLMENT_OVERDUE_REMINDER]: 'Installment Overdue Reminder',
  [NotificationEvent.INSTALLMENT_PAID]: 'Installment Paid',
  [NotificationEvent.USER_ACCOUNT_CREATED]: 'User Account Created',
};

export const NOTIFICATION_EVENT_CHANNELS: Record<NotificationEvent, ReadonlyArray<NotificationChannel>> = {
  [NotificationEvent.LOAN_CREATED]: NOTIFICATION_CHANNELS,
  [NotificationEvent.DOCUMENT_SIGNATURE_REQUESTED]: NOTIFICATION_CHANNELS,
  [NotificationEvent.DOCUMENT_SIGNED]: [NotificationChannel.EMAIL],
  [NotificationEvent.INSTALLMENT_DUE_REMINDER]: NOTIFICATION_CHANNELS,
  [NotificationEvent.INSTALLMENT_OVERDUE_REMINDER]: NOTIFICATION_CHANNELS,
  [NotificationEvent.INSTALLMENT_PAID]: NOTIFICATION_CHANNELS,
  [NotificationEvent.USER_ACCOUNT_CREATED]: [NotificationChannel.EMAIL],
};

export enum NotificationContentFormat {
  RICH_TEXT_JSON = 'RICH_TEXT_JSON',
  PLAIN_TEXT = 'PLAIN_TEXT',
}

export enum NotificationLogStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  RETRYING = 'RETRYING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export const NOTIFICATION_LOG_STATUSES = [
  NotificationLogStatus.QUEUED,
  NotificationLogStatus.PROCESSING,
  NotificationLogStatus.RETRYING,
  NotificationLogStatus.SENT,
  NotificationLogStatus.FAILED,
] as const;

export const NOTIFICATION_LOG_STATUS_LABELS: Record<NotificationLogStatus, string> = {
  [NotificationLogStatus.QUEUED]: 'Queued',
  [NotificationLogStatus.PROCESSING]: 'Processing',
  [NotificationLogStatus.RETRYING]: 'Retrying',
  [NotificationLogStatus.SENT]: 'Sent',
  [NotificationLogStatus.FAILED]: 'Failed',
};

export const NOTIFICATION_CONTENT_FORMATS = [
  NotificationContentFormat.RICH_TEXT_JSON,
  NotificationContentFormat.PLAIN_TEXT,
] as const;

export const NOTIFICATION_CONTENT_FORMAT_LABELS: Record<NotificationContentFormat, string> = {
  [NotificationContentFormat.RICH_TEXT_JSON]: 'Rich Text',
  [NotificationContentFormat.PLAIN_TEXT]: 'Plain Text',
};

export const NOTIFICATION_PLACEHOLDER_GROUPS = [
  {
    label: 'Site',
    items: [
      { key: '{{siteUrl}}', description: 'Application site URL' },
    ],
  },
  {
    label: 'Client',
    items: [
      { key: '{{client.name}}', description: 'Client full name' },
      { key: '{{client.email}}', description: 'Client email address' },
      { key: '{{client.phone}}', description: 'Client phone number' },
    ],
  },
  {
    label: 'Loan',
    items: [
      { key: '{{loan.id}}', description: 'Loan identifier' },
      { key: '{{loan.amount}}', description: 'Loan amount' },
      { key: '{{loan.excessBalance}}', description: 'Total excess amount' },
      { key: '{{loan.currency}}', description: 'Loan currency code' },
      { key: '{{loan.description}}', description: 'Loan description' },
      { key: '{{loan.loanDate}}', description: 'Loan date' },
    ],
  },
  {
    label: 'Document',
    items: [
      { key: '{{document.name}}', description: 'Document template name' },
      { key: '{{document.signUrl}}', description: 'Public signing URL for the document' },
      { key: '{{document.signedAt}}', description: 'Document signed date and time' },
    ],
  },
  {
    label: 'Installment',
    items: [
      { key: '{{loan.installmentCount}}', description: 'Total number of loan installments' },
      { key: '{{installment.number}}', description: 'Current installment number in the loan schedule' },
      { key: '{{installment.amount}}', description: 'Installment amount' },
      { key: '{{installment.dueDate}}', description: 'Installment due date' },
      { key: '{{installment.paidAt}}', description: 'Installment paid date' },
    ],
  },
  {
    label: 'User',
    items: [
      { key: '{{user.name}}', description: 'User full name' },
      { key: '{{user.email}}', description: 'User email address' },
      { key: '{{user.temporaryPassword}}', description: 'Temporary password for first login' },
    ],
  },
] as const;

export const NOTIFICATION_PLACEHOLDER_KEYS = NOTIFICATION_PLACEHOLDER_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key),
);

export const NOTIFICATION_LOGS_LIMIT = 10;
