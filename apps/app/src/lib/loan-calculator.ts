import type { InstallmentInterval } from '@workspace/constants';
import { LOAN_CALCULATOR_PERIODS_PER_YEAR } from '@/app/constants/loan-calculator';
import type {
  LoanCalculatorSummary,
  LoanCalculatorValues,
} from '@/app/types/loan-calculator';

const PERCENT_DIVISOR = 100;

export function getPeriodsPerYear(paymentInterval: InstallmentInterval): number {
  return LOAN_CALCULATOR_PERIODS_PER_YEAR[paymentInterval];
}

export function calculateLoanSummary(values: LoanCalculatorValues): LoanCalculatorSummary {
  const principal = toNonNegativeNumber(values.amount);
  const paymentCount = Math.max(1, Math.trunc(toNonNegativeNumber(values.paymentCount)));
  const periodsPerYear = getPeriodsPerYear(values.paymentInterval);
  const monthlyInterestRate = toNonNegativeNumber(values.monthlyInterestRate);
  const annualInterestRate = toNonNegativeNumber(values.annualInterestRate);
  const normalizedAnnualRate = annualInterestRate / PERCENT_DIVISOR;
  const loanDurationYears = paymentCount / periodsPerYear;
  const periodicRate = normalizedAnnualRate / periodsPerYear;
  const processingFeeValue = values.processingFeeValues[values.processingFeeMode];
  const processingFeeAmount = values.processingFeeMode === 'percent'
    ? principal * (toNonNegativeNumber(processingFeeValue) / PERCENT_DIVISOR)
    : toNonNegativeNumber(processingFeeValue);
  const expectedAmountReceived = principal - processingFeeAmount;

  if (principal === 0) {
    return {
      periodicPayment: 0,
      totalInterest: 0,
      totalRepayment: 0,
      processingFeeAmount,
      expectedAmountReceived,
      periodsPerYear,
      periodicRate,
      loanDurationYears,
      monthlyInterestRate,
      annualInterestRate,
      activeInterestRate: values.interestRateMode === 'monthly' ? monthlyInterestRate : annualInterestRate,
    };
  }

  if (values.calculationMode === 'flatInterest') {
    const totalInterest = principal * normalizedAnnualRate * loanDurationYears;
    const totalRepayment = principal + totalInterest;

    return {
      periodicPayment: totalRepayment / paymentCount,
      totalInterest,
      totalRepayment,
      processingFeeAmount,
      expectedAmountReceived,
      periodsPerYear,
      periodicRate,
      loanDurationYears,
      monthlyInterestRate,
      annualInterestRate,
      activeInterestRate: values.interestRateMode === 'monthly' ? monthlyInterestRate : annualInterestRate,
    };
  }

  if (periodicRate === 0) {
    return {
      periodicPayment: principal / paymentCount,
      totalInterest: 0,
      totalRepayment: principal,
      processingFeeAmount,
      expectedAmountReceived,
      periodsPerYear,
      periodicRate,
      loanDurationYears,
      monthlyInterestRate,
      annualInterestRate,
      activeInterestRate: values.interestRateMode === 'monthly' ? monthlyInterestRate : annualInterestRate,
    };
  }

  const growthFactor = Math.pow(1 + periodicRate, paymentCount);
  const periodicPayment = principal * periodicRate * growthFactor / (growthFactor - 1);
  const totalRepayment = periodicPayment * paymentCount;

  return {
    periodicPayment,
    totalInterest: totalRepayment - principal,
    totalRepayment,
    processingFeeAmount,
    expectedAmountReceived,
    periodsPerYear,
    periodicRate,
    loanDurationYears,
    monthlyInterestRate,
    annualInterestRate,
    activeInterestRate: values.interestRateMode === 'monthly' ? monthlyInterestRate : annualInterestRate,
  };
}

function toNonNegativeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}
