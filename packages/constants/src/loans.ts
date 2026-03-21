export enum InstallmentInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

export enum InstallmentType {
  SINGLE = 'single',
  BULK = 'bulk',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export const INSTALLMENT_STATUSES = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PAID,
  InstallmentStatus.OVERDUE,
] as const;

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'Pending',
  [InstallmentStatus.PAID]: 'Paid',
  [InstallmentStatus.OVERDUE]: 'Overdue',
};

export enum LoanLogEventType {
  LOAN_CREATED = 'LOAN_CREATED',
  LOAN_UPDATED = 'LOAN_UPDATED',
  INSTALLMENT_ADDED = 'INSTALLMENT_ADDED',
  INSTALLMENT_UPDATED = 'INSTALLMENT_UPDATED',
  INSTALLMENT_DELETED = 'INSTALLMENT_DELETED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  PAYMENT_VOIDED = 'PAYMENT_VOIDED',
  ATTACHMENT_UPLOADED = 'ATTACHMENT_UPLOADED',
  ATTACHMENT_DELETED = 'ATTACHMENT_DELETED',
}

export const LOAN_LOG_EVENT_TYPES = [
  LoanLogEventType.LOAN_CREATED,
  LoanLogEventType.LOAN_UPDATED,
  LoanLogEventType.INSTALLMENT_ADDED,
  LoanLogEventType.INSTALLMENT_UPDATED,
  LoanLogEventType.INSTALLMENT_DELETED,
  LoanLogEventType.PAYMENT_RECORDED,
  LoanLogEventType.PAYMENT_VOIDED,
  LoanLogEventType.ATTACHMENT_UPLOADED,
  LoanLogEventType.ATTACHMENT_DELETED,
] as const;

export const LOAN_LOG_EVENT_LABELS: Record<LoanLogEventType, string> = {
  [LoanLogEventType.LOAN_CREATED]: 'Loan Created',
  [LoanLogEventType.LOAN_UPDATED]: 'Loan Updated',
  [LoanLogEventType.INSTALLMENT_ADDED]: 'Installment Added',
  [LoanLogEventType.INSTALLMENT_UPDATED]: 'Installment Updated',
  [LoanLogEventType.INSTALLMENT_DELETED]: 'Installment Deleted',
  [LoanLogEventType.PAYMENT_RECORDED]: 'Payment Recorded',
  [LoanLogEventType.PAYMENT_VOIDED]: 'Payment Voided',
  [LoanLogEventType.ATTACHMENT_UPLOADED]: 'Attachment Uploaded',
  [LoanLogEventType.ATTACHMENT_DELETED]: 'Attachment Deleted',
};

export const INSTALLMENT_INTERVAL_VALUES = [
  InstallmentInterval.MONTHLY,
  InstallmentInterval.QUARTERLY,
  InstallmentInterval.ANNUALLY,
] as const;

export const INSTALLMENT_TYPES = [InstallmentType.SINGLE, InstallmentType.BULK] as const;

export const INSTALLMENT_INTERVALS: Array<InstallmentInterval> = [...INSTALLMENT_INTERVAL_VALUES];

export const INSTALLMENT_INTERVAL_LABELS: Record<InstallmentInterval, string> = {
  [InstallmentInterval.MONTHLY]: 'Monthly',
  [InstallmentInterval.QUARTERLY]: 'Quarterly',
  [InstallmentInterval.ANNUALLY]: 'Annually',
};

export const LOANS_LIMIT = 10;
export const INSTALLMENTS_LIMIT = 10;
export const LOAN_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const LOAN_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/msword',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
] as const;
export const LOAN_ATTACHMENT_ALLOWED_EXTENSIONS = [
  '.csv',
  '.doc',
  '.docx',
  '.gif',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.webp',
  '.xls',
  '.xlsx',
] as const;
export const LOAN_ATTACHMENT_ACCEPT_ATTRIBUTE = [
  ...LOAN_ATTACHMENT_ALLOWED_MIME_TYPES,
  ...LOAN_ATTACHMENT_ALLOWED_EXTENSIONS,
].join(',');
