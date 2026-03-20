import { InstallmentStatus } from '@workspace/constants';

const MANILA_TIME_ZONE = 'Asia/Manila';
const MANILA_UTC_OFFSET_HOURS = 8;

const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function roundCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function getInstallmentRemainingAmount(amount: number, paidAmount: number) {
  return roundCurrencyAmount(Math.max(0, amount - paidAmount));
}

export function isInstallmentPaid(amount: number, paidAmount: number) {
  return getInstallmentRemainingAmount(amount, paidAmount) <= 0;
}

export function getInstallmentStatus(params: {
  amount: number;
  paidAmount: number;
  dueDate: Date;
  currentStatus?: string | null;
  referenceDate?: Date;
}) {
  if (isInstallmentPaid(params.amount, params.paidAmount)) {
    return InstallmentStatus.PAID;
  }

  if (params.currentStatus === InstallmentStatus.OVERDUE) {
    return InstallmentStatus.OVERDUE;
  }

  return isDateBeforeCurrentManilaDay(params.dueDate, params.referenceDate)
    ? InstallmentStatus.OVERDUE
    : InstallmentStatus.PENDING;
}

export function getManilaDayRange(referenceDate: Date = new Date(), offsetDays = 0) {
  const referenceDateParts = getManilaDateParts(referenceDate);
  const targetDate = new Date(Date.UTC(
    referenceDateParts.year,
    referenceDateParts.month - 1,
    referenceDateParts.day,
  ));

  targetDate.setUTCDate(targetDate.getUTCDate() + offsetDays);

  const start = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    -MANILA_UTC_OFFSET_HOURS,
  ));

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

function isDateBeforeCurrentManilaDay(date: Date, referenceDate: Date = new Date()) {
  return date.getTime() < getManilaDayRange(referenceDate).start.getTime();
}

function getManilaDateParts(date: Date) {
  const parts = manilaDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

export function calculateRecordedPayment(params: {
  applyAvailableExcess: boolean;
  availableExcess: number;
  cashAmount: number;
  installmentAmount: number;
  paidAmount: number;
}) {
  const remainingBefore = getInstallmentRemainingAmount(params.installmentAmount, params.paidAmount);
  const availableExcess = roundCurrencyAmount(Math.max(0, params.availableExcess));
  const cashAmount = roundCurrencyAmount(Math.max(0, params.cashAmount));
  const excessAppliedAmount = params.applyAvailableExcess
    ? roundCurrencyAmount(Math.min(availableExcess, remainingBefore))
    : 0;
  const remainingAfterExcess = roundCurrencyAmount(Math.max(0, remainingBefore - excessAppliedAmount));
  const cashAppliedAmount = roundCurrencyAmount(Math.min(cashAmount, remainingAfterExcess));
  const excessCreatedAmount = roundCurrencyAmount(Math.max(0, cashAmount - cashAppliedAmount));
  const appliedAmount = roundCurrencyAmount(excessAppliedAmount + cashAppliedAmount);
  const paidAmountAfter = roundCurrencyAmount(params.paidAmount + appliedAmount);
  const remainingAmountAfter = getInstallmentRemainingAmount(params.installmentAmount, paidAmountAfter);
  const excessBalanceAfter = roundCurrencyAmount(availableExcess - excessAppliedAmount + excessCreatedAmount);

  return {
    remainingBefore,
    excessAppliedAmount,
    cashAppliedAmount,
    excessCreatedAmount,
    appliedAmount,
    paidAmountAfter,
    remainingAmountAfter,
    excessBalanceAfter,
  };
}
