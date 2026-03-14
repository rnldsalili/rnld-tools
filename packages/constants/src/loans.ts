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

export const INSTALLMENT_INTERVAL_VALUES = [
  InstallmentInterval.MONTHLY,
  InstallmentInterval.QUARTERLY,
  InstallmentInterval.ANNUALLY,
] as const;

export const INSTALLMENT_TYPES = [InstallmentType.SINGLE, InstallmentType.BULK] as const;

export const INSTALLMENT_INTERVALS: Array<InstallmentInterval> = [...INSTALLMENT_INTERVAL_VALUES];
