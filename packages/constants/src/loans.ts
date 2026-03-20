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
}

export const LOAN_LOG_EVENT_TYPES = [
  LoanLogEventType.LOAN_CREATED,
  LoanLogEventType.LOAN_UPDATED,
  LoanLogEventType.INSTALLMENT_ADDED,
  LoanLogEventType.INSTALLMENT_UPDATED,
  LoanLogEventType.INSTALLMENT_DELETED,
  LoanLogEventType.PAYMENT_RECORDED,
  LoanLogEventType.PAYMENT_VOIDED,
] as const;

export const LOAN_LOG_EVENT_LABELS: Record<LoanLogEventType, string> = {
  [LoanLogEventType.LOAN_CREATED]: 'Loan Created',
  [LoanLogEventType.LOAN_UPDATED]: 'Loan Updated',
  [LoanLogEventType.INSTALLMENT_ADDED]: 'Installment Added',
  [LoanLogEventType.INSTALLMENT_UPDATED]: 'Installment Updated',
  [LoanLogEventType.INSTALLMENT_DELETED]: 'Installment Deleted',
  [LoanLogEventType.PAYMENT_RECORDED]: 'Payment Recorded',
  [LoanLogEventType.PAYMENT_VOIDED]: 'Payment Voided',
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
