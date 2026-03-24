import type { Currency, InstallmentInterval } from '@workspace/constants';

export type LoanCalculatorMode = 'amortized' | 'flatInterest';
export type LoanCalculatorFeeMode = 'percent' | 'fixed';
export type InterestRateMode = 'monthly' | 'annual';

export interface LoanCalculatorProcessingFeeValues {
  percent: number;
  fixed: number;
}

export interface LoanCalculatorValues {
  amount: number;
  currency: Currency;
  interestRateMode: InterestRateMode;
  monthlyInterestRate: number;
  annualInterestRate: number;
  paymentInterval: InstallmentInterval;
  paymentCount: number;
  calculationMode: LoanCalculatorMode;
  processingFeeMode: LoanCalculatorFeeMode;
  processingFeeValues: LoanCalculatorProcessingFeeValues;
}

export interface LoanCalculatorSummary {
  periodicPayment: number;
  totalInterest: number;
  totalRepayment: number;
  processingFeeAmount: number;
  expectedAmountReceived: number;
  periodsPerYear: number;
  periodicRate: number;
  loanDurationYears: number;
  monthlyInterestRate: number;
  annualInterestRate: number;
  activeInterestRate: number;
}
