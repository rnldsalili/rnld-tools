import { createFileRoute } from '@tanstack/react-router';
import { DownloadIcon, HandCoinsIcon, InfoIcon, Loader2Icon, Share2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  CURRENCIES,
  INSTALLMENT_INTERVAL_LABELS,
  INSTALLMENT_INTERVAL_VALUES,
} from '@workspace/constants';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
} from '@workspace/ui';

import {
  DEFAULT_LOAN_CALCULATOR_VALUES,
  LOAN_CALCULATOR_AMOUNT_MAX,
  LOAN_CALCULATOR_AMOUNT_MIN,
  LOAN_CALCULATOR_FEE_MODE_LABELS,
  LOAN_CALCULATOR_FEE_MODE_VALUES,
  LOAN_CALCULATOR_INTEREST_RATE_MAX,
  LOAN_CALCULATOR_INTEREST_RATE_MIN,
  LOAN_CALCULATOR_INTEREST_RATE_MODE_LABELS,
  LOAN_CALCULATOR_INTEREST_RATE_MODE_VALUES,
  LOAN_CALCULATOR_MODE_LABELS,
  LOAN_CALCULATOR_MODE_VALUES,
  LOAN_CALCULATOR_PAYMENT_COUNT_MAX,
  LOAN_CALCULATOR_PAYMENT_COUNT_MIN,
  LOAN_CALCULATOR_PAYMENT_LABELS,
  LOAN_CALCULATOR_PERIOD_NOUNS,
  LOAN_CALCULATOR_PROCESSING_FEE_MAX,
  LOAN_CALCULATOR_PROCESSING_FEE_MIN,
} from '@/app/constants/loan-calculator';
import { formatCurrency } from '@/app/lib/format';
import { calculateLoanSummary } from '@/app/lib/loan-calculator';
import {
  createLoanCalculatorShareFile,
  downloadLoanCalculatorShareFile,
} from '@/app/lib/loan-calculator-share';
import { isOneOf } from '@/app/lib/value-guards';
import type { LoanCalculatorValues } from '@/app/types/loan-calculator';

const INTEREST_RATE_PRECISION = 4;

export const Route = createFileRoute('/(tools)/loan-calculator')({
  head: () => ({ meta: [{ title: 'RTools - Loan Calculator' }] }),
  staticData: { title: 'Loan Calculator' },
  component: LoanCalculatorPage,
});

function LoanCalculatorPage() {
  const [values, setValues] = useState<LoanCalculatorValues>(DEFAULT_LOAN_CALCULATOR_VALUES);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const summary = calculateLoanSummary(values);
  const paymentIntervalLabel = INSTALLMENT_INTERVAL_LABELS[values.paymentInterval];
  const paymentLabel = LOAN_CALCULATOR_PAYMENT_LABELS[values.paymentInterval];
  const periodNoun = LOAN_CALCULATOR_PERIOD_NOUNS[values.paymentInterval];
  const paymentCountLabel = `${values.paymentCount} ${periodNoun}${values.paymentCount === 1 ? '' : 's'}`;
  const interestModeLabel = LOAN_CALCULATOR_INTEREST_RATE_MODE_LABELS[values.interestRateMode];
  const activeInterestRate = values.interestRateMode === 'monthly'
    ? values.monthlyInterestRate
    : values.annualInterestRate;
  const interestFieldLabel = `${interestModeLabel} (%)`;
  const processingFeeValue = values.processingFeeValues[values.processingFeeMode];
  const processingFeeLabel = values.processingFeeMode === 'percent'
    ? 'Processing Fee (%)'
    : `Processing Fee (${values.currency})`;
  const processingFeeHint = values.processingFeeMode === 'percent'
    ? 'Processing fee is calculated as a percentage of the principal.'
    : 'Processing fee is entered as a fixed currency amount.';

  function setField<TKey extends keyof LoanCalculatorValues>(
    key: TKey,
    value: LoanCalculatorValues[TKey],
  ) {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  }

  function setBoundedNumber<TKey extends keyof LoanCalculatorValues>(
    key: TKey,
    rawValue: string,
    min: number,
    max: number,
  ) {
    const parsedValue = Number(rawValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    setField(key, Math.min(max, Math.max(min, parsedValue)) as LoanCalculatorValues[TKey]);
  }

  function setSynchronizedInterestRates(rawValue: string) {
    const parsedValue = Number(rawValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const boundedValue = Math.min(
      LOAN_CALCULATOR_INTEREST_RATE_MAX,
      Math.max(LOAN_CALCULATOR_INTEREST_RATE_MIN, parsedValue),
    );

    if (values.interestRateMode === 'monthly') {
      setValues((currentValues) => ({
        ...currentValues,
        monthlyInterestRate: boundedValue,
        annualInterestRate: roundTo(boundedValue * 12),
      }));
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      annualInterestRate: boundedValue,
      monthlyInterestRate: roundTo(boundedValue / 12),
    }));
  }

  function setProcessingFeeValue(rawValue: string) {
    const parsedValue = Number(rawValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const boundedValue = Math.min(
      LOAN_CALCULATOR_PROCESSING_FEE_MAX,
      Math.max(LOAN_CALCULATOR_PROCESSING_FEE_MIN, parsedValue),
    );

    setValues((currentValues) => ({
      ...currentValues,
      processingFeeValues: {
        ...currentValues.processingFeeValues,
        [currentValues.processingFeeMode]: boundedValue,
      },
    }));
  }

  async function createShareFile() {
    return createLoanCalculatorShareFile({
      calculationModeLabel: LOAN_CALCULATOR_MODE_LABELS[values.calculationMode],
      interestLabel: `${formatPercentage(activeInterestRate)} ${values.interestRateMode}`,
      paymentLabel,
      paymentDetail: `${paymentCountLabel} • ${paymentLabel}`,
      principalAmount: formatCurrency(values.amount, values.currency),
      periodicPayment: formatCurrency(summary.periodicPayment, values.currency),
      totalRepayment: formatCurrency(summary.totalRepayment, values.currency),
      totalInterest: formatCurrency(summary.totalInterest, values.currency),
      processingFee: formatCurrency(summary.processingFeeAmount, values.currency),
      expectedAmountReceived: formatCurrency(summary.expectedAmountReceived, values.currency),
      isExpectedAmountNegative: summary.expectedAmountReceived < 0,
    });
  }

  async function handleShareResult() {
    if (isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      const shareFile = await createShareFile();

      if (canShareFiles(shareFile)) {
        try {
          await navigator.share({
            files: [shareFile],
            title: 'Loan Calculator Result',
            text: `${paymentLabel}: ${formatCurrency(summary.periodicPayment, values.currency)}`,
          });
          toast.success('Result image shared.');
          return;
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
        }
      }

      downloadLoanCalculatorShareFile(shareFile);
      toast.success('Result image downloaded.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSharing(false);
    }
  }

  async function handleDownloadResult() {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const shareFile = await createShareFile();
      downloadLoanCalculatorShareFile(shareFile);
      toast.success('Result image downloaded.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
      <div className="flex items-center justify-center size-12 rounded-full bg-accent mb-6">
        <HandCoinsIcon className="size-5 text-accent-foreground" />
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Tools</p>
      <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Loan Calculator
      </h1>
      <p className="mb-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        Estimate {paymentLabel.toLowerCase()}, total interest, processing fees, and the amount
        the borrower actually receives after the deduction.
      </p>

      <Card className="w-full max-w-6xl">
        <CardHeader className="px-4 pb-4 sm:px-6">
          <CardTitle className="text-base">Loan Terms</CardTitle>
          <CardDescription>
            Compare flat-rate and amortized payments, switch between monthly and annual interest,
            and share the result as a polished image.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6 px-4 pb-4 sm:gap-8 sm:px-6 sm:pb-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <NumberField
                id="loan-amount"
                label="Loan Amount"
                value={values.amount}
                min={LOAN_CALCULATOR_AMOUNT_MIN}
                max={LOAN_CALCULATOR_AMOUNT_MAX}
                step="0.01"
                onChange={(rawValue) =>
                  setBoundedNumber(
                    'amount',
                    rawValue,
                    LOAN_CALCULATOR_AMOUNT_MIN,
                    LOAN_CALCULATOR_AMOUNT_MAX,
                  )}
              />

              <div className="flex flex-col gap-2">
                <Label htmlFor="loan-currency" className="text-sm font-medium">
                  Currency
                </Label>
                <Select
                  value={values.currency}
                  onValueChange={(nextCurrency) => {
                    if (isOneOf(CURRENCIES, nextCurrency)) {
                      setField('currency', nextCurrency);
                    }
                  }}
                >
                  <SelectTrigger id="loan-currency" className="w-full bg-background">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Calculation Mode</Label>
              <ToggleGroup>
                {LOAN_CALCULATOR_MODE_VALUES.map((mode) => (
                  <ToggleButton
                    key={mode}
                    isActive={values.calculationMode === mode}
                    onClick={() => setField('calculationMode', mode)}
                  >
                    {LOAN_CALCULATOR_MODE_LABELS[mode]}
                  </ToggleButton>
                ))}
              </ToggleGroup>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Interest Input</Label>
              <ToggleGroup>
                {LOAN_CALCULATOR_INTEREST_RATE_MODE_VALUES.map((interestMode) => (
                  <ToggleButton
                    key={interestMode}
                    isActive={values.interestRateMode === interestMode}
                    onClick={() => setField('interestRateMode', interestMode)}
                  >
                    {LOAN_CALCULATOR_INTEREST_RATE_MODE_LABELS[interestMode]}
                  </ToggleButton>
                ))}
              </ToggleGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="interest-rate"
                label={interestFieldLabel}
                value={activeInterestRate}
                min={LOAN_CALCULATOR_INTEREST_RATE_MIN}
                max={LOAN_CALCULATOR_INTEREST_RATE_MAX}
                step="0.01"
                onChange={setSynchronizedInterestRates}
              />

              <NumberField
                id="payment-count"
                label="Number of Payments"
                value={values.paymentCount}
                min={LOAN_CALCULATOR_PAYMENT_COUNT_MIN}
                max={LOAN_CALCULATOR_PAYMENT_COUNT_MAX}
                step="1"
                onChange={(rawValue) =>
                  setBoundedNumber(
                    'paymentCount',
                    rawValue,
                    LOAN_CALCULATOR_PAYMENT_COUNT_MIN,
                    LOAN_CALCULATOR_PAYMENT_COUNT_MAX,
                  )}
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Synced Interest
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {formatPercentage(summary.monthlyInterestRate)} monthly •{' '}
                {formatPercentage(summary.annualInterestRate)} annual
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Payment Schedule</Label>
              <ToggleGroup>
                {INSTALLMENT_INTERVAL_VALUES.map((interval) => (
                  <ToggleButton
                    key={interval}
                    isActive={values.paymentInterval === interval}
                    onClick={() => setField('paymentInterval', interval)}
                  >
                    {INSTALLMENT_INTERVAL_LABELS[interval]}
                  </ToggleButton>
                ))}
              </ToggleGroup>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium">Processing Fee</Label>
                <ToggleGroup>
                  {LOAN_CALCULATOR_FEE_MODE_VALUES.map((feeMode) => (
                    <ToggleButton
                      key={feeMode}
                      isActive={values.processingFeeMode === feeMode}
                      onClick={() => setField('processingFeeMode', feeMode)}
                    >
                      {LOAN_CALCULATOR_FEE_MODE_LABELS[feeMode]}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </div>

              <NumberField
                id="processing-fee"
                label={processingFeeLabel}
                value={processingFeeValue}
                min={LOAN_CALCULATOR_PROCESSING_FEE_MIN}
                max={LOAN_CALCULATOR_PROCESSING_FEE_MAX}
                step="0.01"
                onChange={setProcessingFeeValue}
              />

              <p className="text-xs leading-relaxed text-muted-foreground">{processingFeeHint}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {paymentLabel}
                  </p>
                  <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {formatCurrency(summary.periodicPayment, values.currency)}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={handleDownloadResult}
                    disabled={isDownloading}
                    className="w-full gap-2 sm:w-auto"
                  >
                    {isDownloading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <DownloadIcon className="size-4" />
                    )}
                    {isDownloading ? 'Preparing...' : 'Download'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShareResult}
                    disabled={isSharing}
                    className="w-full gap-2 sm:w-auto"
                  >
                    {isSharing ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <Share2Icon className="size-4" />
                    )}
                    {isSharing ? 'Preparing...' : 'Share'}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {LOAN_CALCULATOR_MODE_LABELS[values.calculationMode]} across {paymentCountLabel} at{' '}
                {formatPercentage(activeInterestRate)} {values.interestRateMode} interest.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <SummaryCard
                label="Total Interest"
                value={formatCurrency(summary.totalInterest, values.currency)}
              />
              <SummaryCard
                label="Total Repayment"
                value={formatCurrency(summary.totalRepayment, values.currency)}
              />
              <SummaryCard
                label="Processing Fee"
                value={formatCurrency(summary.processingFeeAmount, values.currency)}
              />
              <SummaryCard
                label="Expected Amount Received"
                value={formatCurrency(summary.expectedAmountReceived, values.currency)}
                valueClassName={cn(summary.expectedAmountReceived < 0 && 'text-destructive')}
              />
            </div>

            <div className="rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <InfoIcon className="size-4 text-muted-foreground" />
                <span>Calculation Summary</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This {paymentIntervalLabel.toLowerCase()} plan estimates a{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.periodicPayment, values.currency)}
                </span>{' '}
                payment for each of the {values.paymentCount} scheduled payments.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The interest basis is{' '}
                <span className="font-medium text-foreground">
                  {formatPercentage(summary.monthlyInterestRate)}
                </span>{' '}
                per month or{' '}
                <span className="font-medium text-foreground">
                  {formatPercentage(summary.annualInterestRate)}
                </span>{' '}
                per year.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                You would repay{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.totalRepayment, values.currency)}
                </span>{' '}
                in total, including{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.totalInterest, values.currency)}
                </span>{' '}
                in interest.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                After deducting the processing fee of{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.processingFeeAmount, values.currency)}
                </span>
                , the expected released amount is{' '}
                <span
                  className={cn(
                    'font-medium text-foreground',
                    summary.expectedAmountReceived < 0 && 'text-destructive',
                  )}
                >
                  {formatCurrency(summary.expectedAmountReceived, values.currency)}
                </span>
                .
              </p>
              {summary.expectedAmountReceived < 0 && (
                <p className="mt-2 text-sm leading-relaxed text-destructive">
                  The processing fee is higher than the principal, so the net released amount is
                  negative.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <InfoIcon className="size-4 text-muted-foreground" />
                <span>How This Is Calculated</span>
              </div>
              {values.interestRateMode === 'monthly' ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  The calculator starts from {formatPercentage(summary.monthlyInterestRate)} monthly
                  interest, annualizes it to {formatPercentage(summary.annualInterestRate)}, then
                  applies the selected loan formula.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  The calculator starts from {formatPercentage(summary.annualInterestRate)} annual
                  interest, which is equivalent to {formatPercentage(summary.monthlyInterestRate)}
                  monthly before the selected loan formula is applied.
                </p>
              )}
              {values.calculationMode === 'amortized' ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  For amortized loans, the annual rate is divided by {summary.periodsPerYear} to get{' '}
                  {formatPercentage(summary.periodicRate * 100)} per {periodNoun}, then the standard
                  amortization formula spreads principal and interest across {values.paymentCount}{' '}
                  payments.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  For flat-rate loans, simple interest is calculated on the original principal for{' '}
                  {formatDecimal(summary.loanDurationYears)} year
                  {summary.loanDurationYears === 1 ? '' : 's'}, then added to the principal and split
                  evenly across {values.paymentCount} payments.
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The processing fee only reduces the disbursed amount. It does not reduce the
                financed principal used in the repayment formula.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-background"
      />
    </div>
  );
}

function ToggleGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full grid-flow-col auto-cols-fr gap-2 rounded-xl border border-input bg-muted/50 p-1">
      {children}
    </div>
  );
}

function ToggleButton({
  children,
  isActive,
  onClick,
}: {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full min-w-0 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-2 break-words text-base font-semibold tracking-tight text-foreground sm:text-lg', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function canShareFiles(file: File): boolean {
  if (typeof navigator.share !== 'function') {
    return false;
  }

  if (typeof navigator.canShare !== 'function') {
    return true;
  }

  return navigator.canShare({ files: [file] });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function roundTo(value: number): number {
  return Number(value.toFixed(INTEREST_RATE_PRECISION));
}

function formatPercentage(value: number): string {
  return `${formatDecimal(value)}%`;
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
