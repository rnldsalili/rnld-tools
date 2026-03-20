import { InstallmentStatus } from '@workspace/constants';

export function roundCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function getInstallmentRemainingAmount(amount: number, paidAmount: number) {
  return roundCurrencyAmount(Math.max(0, amount - paidAmount));
}

export function isInstallmentPaid(amount: number, paidAmount: number) {
  return getInstallmentRemainingAmount(amount, paidAmount) <= 0;
}

export function getInstallmentStatus(amount: number, paidAmount: number) {
  return isInstallmentPaid(amount, paidAmount)
    ? InstallmentStatus.PAID
    : InstallmentStatus.PENDING;
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
