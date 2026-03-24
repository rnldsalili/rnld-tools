import { Currency, InstallmentInterval } from '@workspace/constants';
import type {
  InterestRateMode,
  LoanCalculatorFeeMode,
  LoanCalculatorMode,
  LoanCalculatorProcessingFeeValues,
  LoanCalculatorValues,
} from '@/app/types/loan-calculator';

export const LOAN_CALCULATOR_MODE_VALUES = ['flatInterest', 'amortized'] as const;
export const LOAN_CALCULATOR_FEE_MODE_VALUES = ['percent', 'fixed'] as const;
export const LOAN_CALCULATOR_INTEREST_RATE_MODE_VALUES = ['monthly', 'annual'] as const;

export const LOAN_CALCULATOR_AMOUNT_MIN = 0;
export const LOAN_CALCULATOR_AMOUNT_MAX = 999_999_999;
export const LOAN_CALCULATOR_INTEREST_RATE_MIN = 0;
export const LOAN_CALCULATOR_INTEREST_RATE_MAX = 1_000;
export const LOAN_CALCULATOR_PAYMENT_COUNT_MIN = 1;
export const LOAN_CALCULATOR_PAYMENT_COUNT_MAX = 360;
export const LOAN_CALCULATOR_PROCESSING_FEE_MIN = 0;
export const LOAN_CALCULATOR_PROCESSING_FEE_MAX = 999_999_999;

export const LOAN_CALCULATOR_MODE_LABELS: Record<LoanCalculatorMode, string> = {
  flatInterest: 'Flat Rate',
  amortized: 'Amortized',
};

export const LOAN_CALCULATOR_FEE_MODE_LABELS: Record<LoanCalculatorFeeMode, string> = {
  percent: 'Percent',
  fixed: 'Fixed Amount',
};

export const LOAN_CALCULATOR_INTEREST_RATE_MODE_LABELS: Record<InterestRateMode, string> = {
  monthly: 'Monthly Interest',
  annual: 'Annual Interest',
};

export const LOAN_CALCULATOR_PERIODS_PER_YEAR: Record<InstallmentInterval, number> = {
  [InstallmentInterval.MONTHLY]: 12,
  [InstallmentInterval.QUARTERLY]: 4,
  [InstallmentInterval.ANNUALLY]: 1,
};

export const LOAN_CALCULATOR_PAYMENT_LABELS: Record<InstallmentInterval, string> = {
  [InstallmentInterval.MONTHLY]: 'Monthly Payment',
  [InstallmentInterval.QUARTERLY]: 'Quarterly Payment',
  [InstallmentInterval.ANNUALLY]: 'Annual Payment',
};

export const LOAN_CALCULATOR_PERIOD_NOUNS: Record<InstallmentInterval, string> = {
  [InstallmentInterval.MONTHLY]: 'month',
  [InstallmentInterval.QUARTERLY]: 'quarter',
  [InstallmentInterval.ANNUALLY]: 'year',
};

export const DEFAULT_LOAN_CALCULATOR_PROCESSING_FEE_VALUES: LoanCalculatorProcessingFeeValues = {
  percent: 1,
  fixed: 300,
};

export const DEFAULT_LOAN_CALCULATOR_VALUES: LoanCalculatorValues = {
  amount: 10_000,
  currency: Currency.PHP,
  interestRateMode: 'monthly',
  monthlyInterestRate: 5,
  annualInterestRate: 60,
  paymentInterval: InstallmentInterval.MONTHLY,
  paymentCount: 6,
  calculationMode: 'flatInterest',
  processingFeeMode: 'percent',
  processingFeeValues: DEFAULT_LOAN_CALCULATOR_PROCESSING_FEE_VALUES,
};
