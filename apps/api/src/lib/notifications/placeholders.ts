import { NotificationEvent } from '@workspace/constants';

export interface NotificationTemplateSampleContext {
  client: {
    name: string;
    email: string;
    phone: string;
  };
  loan: {
    id: string;
    amount: number;
    excessBalance: number;
    currency: string;
    description: string | null;
    loanDate: string;
    installmentCount: number;
  };
  installment: {
    amount: number | null;
    dueDate: string | null;
    paidAt: string | null;
  };
  user: {
    name: string;
    email: string;
    temporaryPassword: string;
  };
}

const DISPLAY_LOCALE = 'en-US';
const DISPLAY_TIME_ZONE = 'Asia/Manila';
const defaultNotificationSiteUrl = 'http://localhost:3010';
const missingValue = '-';

const currencyFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: DISPLAY_TIME_ZONE,
});

export function buildNotificationSampleContext(event: NotificationEvent): NotificationTemplateSampleContext {
  const baseDate = new Date('2026-03-17T09:00:00+08:00');
  const dueDate = new Date(baseDate);
  const paidAt = new Date(baseDate);

  if (event === NotificationEvent.LOAN_CREATED) {
    dueDate.setDate(dueDate.getDate() + 7);
    paidAt.setDate(paidAt.getDate() + 9);
  }

  if (event === NotificationEvent.INSTALLMENT_DUE_REMINDER) {
    dueDate.setDate(dueDate.getDate() + 1);
    paidAt.setDate(paidAt.getDate() + 4);
  }

  if (event === NotificationEvent.INSTALLMENT_OVERDUE_REMINDER) {
    dueDate.setDate(dueDate.getDate() - 3);
    paidAt.setDate(paidAt.getDate() + 2);
  }

  if (event === NotificationEvent.INSTALLMENT_PAID) {
    dueDate.setDate(dueDate.getDate() - 5);
    paidAt.setDate(paidAt.getDate() - 1);
  }

  return {
    client: {
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@example.com',
      phone: '09171234567',
    },
    loan: {
      id: 'loan_sample_001',
      amount: 25000,
      excessBalance: 1250,
      currency: 'PHP',
      description: 'Short-term personal loan',
      loanDate: baseDate.toISOString(),
      installmentCount: 5,
    },
    installment: {
      amount: 5000,
      dueDate: dueDate.toISOString(),
      paidAt: paidAt.toISOString(),
    },
    user: {
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      temporaryPassword: 'TempPass123!',
    },
  };
}

export function getNotificationPlaceholderValues(
  context: NotificationTemplateSampleContext,
  siteUrl?: string,
): Record<string, string> {
  return {
    '{{siteUrl}}': siteUrl?.trim() || defaultNotificationSiteUrl,
    '{{client.name}}': context.client.name,
    '{{client.email}}': context.client.email || missingValue,
    '{{client.phone}}': context.client.phone || missingValue,
    '{{loan.id}}': context.loan.id,
    '{{loan.amount}}': `${currencyFormatter.format(context.loan.amount)} ${context.loan.currency}`,
    '{{loan.excessBalance}}': formatCurrencyAmount(context.loan.excessBalance, context.loan.currency),
    '{{loan.currency}}': context.loan.currency,
    '{{loan.description}}': context.loan.description || missingValue,
    '{{loan.loanDate}}': formatDate(context.loan.loanDate),
    '{{loan.installmentCount}}': String(context.loan.installmentCount),
    '{{installment.amount}}': formatCurrencyAmount(context.installment.amount, context.loan.currency),
    '{{installment.dueDate}}': formatDate(context.installment.dueDate),
    '{{installment.paidAt}}': formatDateTime(context.installment.paidAt),
    '{{user.name}}': context.user.name || missingValue,
    '{{user.email}}': context.user.email || missingValue,
    '{{user.temporaryPassword}}': context.user.temporaryPassword || missingValue,
  };
}

export function getNotificationSiteUrl(env: Pick<CloudflareBindings, 'APP_URL'>) {
  return env.APP_URL.trim() || defaultNotificationSiteUrl;
}

function formatDate(value: string | null) {
  if (!value) {
    return missingValue;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? missingValue : dateFormatter.format(dateValue);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return missingValue;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? missingValue : dateTimeFormatter.format(dateValue);
}

function formatCurrencyAmount(value: number | null, currency: string) {
  if (value === null || Number.isNaN(value)) {
    return missingValue;
  }

  return `${currencyFormatter.format(value)} ${currency}`;
}
