import { useForm } from '@tanstack/react-form';
import { useRouter } from '@tanstack/react-router';
import { addMonths, addYears, format, parseISO } from 'date-fns';
import {
  BellRingIcon,
  CalendarRangeIcon,
  LoaderCircleIcon,
  WalletCardsIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  ProgressStepper,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  cn,
} from '@workspace/ui';
import {
  CURRENCIES,
  Currency,
  INSTALLMENT_INTERVAL_LABELS,
  INSTALLMENT_INTERVAL_VALUES,
  InstallmentInterval,
  InstallmentStatus,
  InstallmentType,
} from '@workspace/constants';
import type { ProgressStepperItem } from '@workspace/ui';
import type { ClientListItem } from '@/app/hooks/use-client';
import { ClientSelector } from '@/app/components/loans/client-selector';
import { useEnabledClients } from '@/app/hooks/use-client';
import { useCreateLoan } from '@/app/hooks/use-loan';
import { toStartOfDayIso } from '@/app/lib/date';
import { toFieldErrors } from '@/app/lib/form';
import { formatCurrency } from '@/app/lib/format';
import { isOneOf } from '@/app/lib/value-guards';

interface CreateLoanFormValues {
  clientId: string;
  amount: string;
  currency: (typeof CURRENCIES)[number];
  installmentInterval: InstallmentInterval;
  loanDate: string;
  interestRate: string;
  description: string;
  notificationsEnabled: boolean;
  count: string;
  startDate: string;
  installmentAmount: string;
}

interface InstallmentPreviewRow {
  amount: number;
  dueDate: Date;
  index: number;
  status: InstallmentStatus;
}

enum CreateLoanStep {
  DETAILS = 'details',
  REVIEW = 'review',
  SUBMITTING = 'submitting',
}

const CREATE_LOAN_STEPS = [
  CreateLoanStep.DETAILS,
  CreateLoanStep.REVIEW,
  CreateLoanStep.SUBMITTING,
] as const;

const CREATE_LOAN_STEP_LABELS: Record<CreateLoanStep, string> = {
  [CreateLoanStep.DETAILS]: 'Details',
  [CreateLoanStep.REVIEW]: 'Review',
  [CreateLoanStep.SUBMITTING]: 'Submitting',
};

function getNextInstallmentStartDate(loanDate: string, interval: InstallmentInterval) {
  if (!loanDate) {
    return '';
  }

  const parsedLoanDate = parseISO(loanDate);

  if (Number.isNaN(parsedLoanDate.getTime())) {
    return '';
  }

  const nextInstallmentDate = interval === InstallmentInterval.ANNUALLY
    ? addYears(parsedLoanDate, 1)
    : addMonths(parsedLoanDate, interval === InstallmentInterval.QUARTERLY ? 3 : 1);

  return format(nextInstallmentDate, 'yyyy-MM-dd');
}

function addInstallmentInterval(startDate: Date, interval: InstallmentInterval, step: number): Date {
  const originalDay = startDate.getDate();
  const nextDate = new Date(startDate);

  nextDate.setDate(1);

  if (interval === InstallmentInterval.ANNUALLY) {
    nextDate.setFullYear(startDate.getFullYear() + step);
  } else {
    const monthsToAdd = interval === InstallmentInterval.QUARTERLY ? 3 : 1;
    nextDate.setMonth(startDate.getMonth() + monthsToAdd * step);
  }

  const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
  nextDate.setDate(Math.min(originalDay, lastDayOfMonth));

  return nextDate;
}

function createDefaultValues(): CreateLoanFormValues {
  const loanDate = format(new Date(), 'yyyy-MM-dd');
  const installmentInterval = InstallmentInterval.MONTHLY;

  return {
    clientId: '',
    amount: '',
    currency: Currency.PHP,
    installmentInterval,
    loanDate,
    interestRate: '',
    description: '',
    notificationsEnabled: true,
    count: '1',
    startDate: getNextInstallmentStartDate(loanDate, installmentInterval),
    installmentAmount: '',
  };
}

function buildInstallmentsPayload(value: CreateLoanFormValues) {
  return {
    type: InstallmentType.BULK as const,
    interval: value.installmentInterval,
    count: parseInt(value.count, 10),
    startDate: toStartOfDayIso(value.startDate),
    amount: parseFloat(value.installmentAmount),
    status: InstallmentStatus.PENDING,
  };
}

function buildInstallmentPreviewRows(value: CreateLoanFormValues): Array<InstallmentPreviewRow> {
  const parsedCount = parseInt(value.count, 10);
  const parsedAmount = parseFloat(value.installmentAmount);
  const parsedStartDate = parseISO(value.startDate);

  if (
    Number.isNaN(parsedCount)
    || parsedCount < 1
    || Number.isNaN(parsedAmount)
    || parsedAmount <= 0
    || Number.isNaN(parsedStartDate.getTime())
  ) {
    return [];
  }

  return Array.from({ length: parsedCount }, (_, index) => ({
    amount: parsedAmount,
    dueDate: addInstallmentInterval(parsedStartDate, value.installmentInterval, index),
    index: index + 1,
    status: InstallmentStatus.PENDING,
  }));
}

function formatDateValue(value: string) {
  if (!value) {
    return '—';
  }

  const parsedDate = parseISO(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return format(parsedDate, 'MMM d, yyyy');
}

function formatOptionalNumberValue(value: string, suffix = '') {
  if (!value) {
    return '—';
  }

  const parsedValue = parseFloat(value);

  if (Number.isNaN(parsedValue)) {
    return '—';
  }

  return `${parsedValue.toFixed(2)}${suffix}`;
}

function getCreateLoanStepIndex(step: CreateLoanStep) {
  return CREATE_LOAN_STEPS.indexOf(step);
}

function getCreateLoanStepState(step: CreateLoanStep, currentStep: CreateLoanStep) {
  const currentStepIndex = getCreateLoanStepIndex(currentStep);
  const stepIndex = getCreateLoanStepIndex(step);

  if (stepIndex < currentStepIndex) {
    return 'complete' as const;
  }

  if (stepIndex === currentStepIndex) {
    return 'current' as const;
  }

  return 'pending' as const;
}

function getCreateLoanStepperItems(currentStep: CreateLoanStep): Array<ProgressStepperItem> {
  return CREATE_LOAN_STEPS.map((step, index) => ({
    ariaLabel: `Step ${index + 1}: ${CREATE_LOAN_STEP_LABELS[step]}`,
    id: step,
    isLoading: step === CreateLoanStep.SUBMITTING,
    label: CREATE_LOAN_STEP_LABELS[step],
    state: getCreateLoanStepState(step, currentStep),
    stepLabel: `Step ${index + 1}`,
  }));
}

export function CreateLoanForm() {
  const router = useRouter();
  const { data: enabledClientsData } = useEnabledClients();
  const { mutateAsync, isPending } = useCreateLoan();
  const [currentStep, setCurrentStep] = useState<CreateLoanStep>(CreateLoanStep.DETAILS);
  const [hasManualStartDate, setHasManualStartDate] = useState(false);
  const [pendingSubmissionValues, setPendingSubmissionValues] = useState<CreateLoanFormValues | null>(null);
  const currentStepRef = useRef(currentStep);
  const hasTriggeredSubmissionRef = useRef(false);

  const form = useForm({
    defaultValues: createDefaultValues(),
    onSubmit: ({ value }) => {
      if (currentStepRef.current === CreateLoanStep.DETAILS) {
        setCurrentStep(CreateLoanStep.REVIEW);
        return;
      }

      if (currentStepRef.current === CreateLoanStep.REVIEW) {
        setPendingSubmissionValues(value);
        setCurrentStep(CreateLoanStep.SUBMITTING);
      }
    },
  });

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (
      currentStep !== CreateLoanStep.SUBMITTING
      || !pendingSubmissionValues
      || hasTriggeredSubmissionRef.current
    ) {
      return;
    }

    hasTriggeredSubmissionRef.current = true;

    const submitLoan = async () => {
      const loanPayload: Parameters<typeof mutateAsync>[0]['body'] = {
        clientId: pendingSubmissionValues.clientId,
        amount: parseFloat(pendingSubmissionValues.amount),
        currency: pendingSubmissionValues.currency,
        installmentInterval: pendingSubmissionValues.installmentInterval,
        loanDate: toStartOfDayIso(pendingSubmissionValues.loanDate),
        interestRate: pendingSubmissionValues.interestRate !== ''
          ? parseFloat(pendingSubmissionValues.interestRate)
          : undefined,
        description: pendingSubmissionValues.description.trim() || undefined,
        notificationsEnabled: pendingSubmissionValues.notificationsEnabled,
        installments: buildInstallmentsPayload(pendingSubmissionValues),
      };

      try {
        const createdLoanResponse = await mutateAsync({ body: loanPayload });

        toast.success('Loan created successfully.');
        setHasManualStartDate(false);
        setPendingSubmissionValues(null);

        await router.navigate({
          to: '/loans/$loanId',
          params: { loanId: createdLoanResponse.data.loan.id },
        });
      } catch (error) {
        toast.error((error as Error).message);
        setCurrentStep(CreateLoanStep.REVIEW);
        setPendingSubmissionValues(null);
      } finally {
        hasTriggeredSubmissionRef.current = false;
      }
    };

    void submitLoan();
  }, [currentStep, mutateAsync, pendingSubmissionValues, router]);

  function syncStartDate(loanDate: string, installmentInterval: InstallmentInterval) {
    if (hasManualStartDate) {
      return;
    }

    form.setFieldValue('startDate', getNextInstallmentStartDate(loanDate, installmentInterval));
  }

  const formValues = form.state.values;
  const enabledClients = enabledClientsData?.data.clients ?? [];
  const selectedClient = enabledClients.find((client) => client.id === formValues.clientId) ?? null;
  const installmentPreviewRows = buildInstallmentPreviewRows(formValues);
  const scheduledTotalAmount = installmentPreviewRows.reduce((total, installment) => total + installment.amount, 0);
  const isDetailsStep = currentStep === CreateLoanStep.DETAILS;
  const isReviewStep = currentStep === CreateLoanStep.REVIEW;
  const isSubmittingStep = currentStep === CreateLoanStep.SUBMITTING;
  const stepperItems = getCreateLoanStepperItems(currentStep);

  const actionButtons = isDetailsStep ? (
    <>
      <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => void router.navigate({ to: '/loans' })}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        Continue to Review
      </Button>
    </>
  ) : isReviewStep ? (
    <>
      <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setCurrentStep(CreateLoanStep.DETAILS)}
      >
        Back to Details
      </Button>
      <Button type="submit" disabled={isPending}>
        Create Loan
      </Button>
    </>
  ) : null;

  return (
    <form
        id="create-loan-form"
        onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
        className="flex min-h-full flex-col gap-6"
    >
      <ProgressStepper items={stepperItems} />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        {isDetailsStep ? (
          <div className="grid flex-1 gap-10 xl:grid-cols-2 xl:items-start xl:gap-12">
            <section className="space-y-6">
              <SectionHeading
                  icon={WalletCardsIcon}
                  title="Loan Details"
              />

              <FieldGroup className="gap-5">
                <form.Field
                    name="clientId"
                    validators={{
                    onChange: ({ value }) => (!value ? 'Client is required' : undefined),
                  }}
                >
                  {(field) => (
                    <ClientSelector
                        clientId={field.state.value}
                        errors={field.state.meta.errors}
                        onChange={field.handleChange}
                    />
                  )}
                </form.Field>

                <div className="grid gap-4">
                  <form.Field
                      name="amount"
                      validators={{
                      onChange: ({ value }) => {
                        if (!value) return 'Amount is required';
                        const parsedAmount = parseFloat(value);
                        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return 'Must be a positive number';
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Amount <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id={field.name}
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="currency">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Currency <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                            if (isOneOf(CURRENCIES, value)) {
                              field.handleChange(value);
                            }
                          }}
                        >
                          <SelectTrigger id={field.name}>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((currencyOption) => (
                              <SelectItem key={currencyOption} value={currencyOption}>
                                {currencyOption}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.Field>
                </div>

                <div className="grid gap-4">
                  <form.Field
                      name="loanDate"
                      validators={{
                      onChange: ({ value }) => (!value ? 'Loan date is required' : undefined),
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Loan Date <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id={field.name}
                            type="date"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => {
                            const nextLoanDate = event.target.value;

                            field.handleChange(nextLoanDate);
                            syncStartDate(nextLoanDate, form.getFieldValue('installmentInterval'));
                          }}
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                      name="interestRate"
                      validators={{
                      onChange: ({ value }) => {
                        if (!value) return undefined;
                        const parsedInterestRate = parseFloat(value);
                        if (Number.isNaN(parsedInterestRate) || parsedInterestRate < 0) return 'Must be 0 or greater';
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>Interest Rate (%)</FieldLabel>
                        <Input
                            id={field.name}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 5.5"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <form.Field name="description">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                      <Textarea
                          id={field.name}
                          placeholder="Optional notes about this loan..."
                          rows={4}
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </section>

            <section className="space-y-6 border-t border-border/70 pt-8 xl:border-t-0 xl:pt-0">
              <SectionHeading
                  icon={CalendarRangeIcon}
                  title="Installment Schedule"
              />

              <FieldGroup className="gap-5">
                <div className="grid gap-4">
                  <form.Field name="installmentInterval">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Interval <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                            if (isOneOf(INSTALLMENT_INTERVAL_VALUES, value)) {
                              field.handleChange(value);
                              syncStartDate(form.getFieldValue('loanDate'), value);
                            }
                          }}
                        >
                          <SelectTrigger id={field.name}>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTALLMENT_INTERVAL_VALUES.map((interval) => (
                              <SelectItem key={interval} value={interval}>
                                {INSTALLMENT_INTERVAL_LABELS[interval]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                      name="count"
                      validators={{
                      onChange: ({ value }) => {
                        const parsedCount = parseInt(value, 10);
                        if (!value || Number.isNaN(parsedCount) || parsedCount < 1 || parsedCount > 360) {
                          return 'Count must be 1-360';
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Count <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id={field.name}
                            type="number"
                            min="1"
                            max="360"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <div className="grid gap-4">
                  <form.Field
                      name="startDate"
                      validators={{
                      onChange: ({ value }) => (!value ? 'Start date is required' : undefined),
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          First Due Date <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id={field.name}
                            type="date"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => {
                            setHasManualStartDate(true);
                            field.handleChange(event.target.value);
                          }}
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                      name="installmentAmount"
                      validators={{
                      onChange: ({ value }) => {
                        if (!value) return 'Amount is required';
                        const parsedInstallmentAmount = parseFloat(value);
                        if (Number.isNaN(parsedInstallmentAmount) || parsedInstallmentAmount <= 0) {
                          return 'Must be a positive number';
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Amount per Installment <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            id={field.name}
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <form.Field name="notificationsEnabled">
                  {(field) => (
                    <Field>
                      <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-5">
                        <div className="space-y-1">
                          <FieldLabel htmlFor={field.name} className="flex items-center gap-2">
                            <BellRingIcon className="size-4 text-primary" />
                            Send notifications
                          </FieldLabel>
                          <FieldDescription>
                            When disabled, no loan-related notifications will be sent for this loan.
                          </FieldDescription>
                        </div>
                        <Switch
                            id={field.name}
                            checked={field.state.value}
                            onCheckedChange={field.handleChange}
                        />
                      </div>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </section>
          </div>
        ) : null}

        {isReviewStep ? (
          <ReviewStep
              selectedClient={selectedClient}
              values={formValues}
              installmentPreviewRows={installmentPreviewRows}
              scheduledTotalAmount={scheduledTotalAmount}
          />
        ) : null}

        {isSubmittingStep ? <SubmittingStep /> : null}

        {actionButtons ? (
          <div className="mt-8 hidden border-t border-border/70 pt-6 xl:flex xl:justify-end">
            <div className="flex items-center gap-3">
              {actionButtons}
            </div>
          </div>
        ) : null}
      </div>

      {actionButtons ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {actionButtons}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ReviewStep({
  selectedClient,
  values,
  installmentPreviewRows,
  scheduledTotalAmount,
}: {
  installmentPreviewRows: Array<InstallmentPreviewRow>;
  scheduledTotalAmount: number;
  selectedClient: ClientListItem | null;
  values: CreateLoanFormValues;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <SectionHeading
            icon={WalletCardsIcon}
            title="Review Loan"
        />

        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          <ReviewField
              label="Client"
              value={selectedClient?.name ?? (values.clientId ? 'Selected client' : '—')}
              helper={selectedClient
              ? `${selectedClient.email ?? 'No email'} • ${selectedClient.phone ?? 'No phone'}`
              : undefined}
          />
          <ReviewField
              label="Amount"
              value={formatCurrency(Number.parseFloat(values.amount || '0') || 0, values.currency)}
          />
          <ReviewField label="Currency" value={values.currency} />
          <ReviewField label="Loan Date" value={formatDateValue(values.loanDate)} />
          <ReviewField
              label="Interest Rate"
              value={formatOptionalNumberValue(values.interestRate, '%')}
          />
          <ReviewField
              label="Notifications"
              value={values.notificationsEnabled ? 'Enabled' : 'Disabled'}
          />
          <ReviewField
              label="Interval"
              value={INSTALLMENT_INTERVAL_LABELS[values.installmentInterval]}
          />
          <ReviewField label="Count" value={values.count} />
          <ReviewField
              label="Description"
              value={values.description.trim() || '—'}
              className="md:col-span-2"
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border/70 pt-8">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
              icon={CalendarRangeIcon}
              title="Installments Preview"
          />
          <Badge className="border-0 bg-muted text-xs text-muted-foreground">
            {installmentPreviewRows.length}
          </Badge>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installmentPreviewRows.map((installment) => (
                <TableRow key={installment.index}>
                  <TableCell>{installment.index}</TableCell>
                  <TableCell>{format(installment.dueDate, 'MMM d, yyyy')}</TableCell>
                  <TableCell>{formatCurrency(installment.amount, values.currency)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {installment.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/10 px-3 py-3 text-sm">
            <span className="font-medium text-foreground">Scheduled Total</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(scheduledTotalAmount, values.currency)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SubmittingStep() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LoaderCircleIcon className="size-6 animate-spin" />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Creating loan
          </h2>
          <p className="text-sm text-muted-foreground">
            Saving the loan and generating the installment schedule now.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewField({
  label,
  value,
  helper,
  className,
}: {
  className?: string;
  helper?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="text-sm text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
    </div>
  );
}
