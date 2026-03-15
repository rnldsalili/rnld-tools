import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
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
import { useCreateLoan } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';

type InstallmentMode = 'single' | 'bulk';

interface DefaultValues {
  borrower: string;
  amount: string;
  currency: string;
  installmentInterval: string;
  interestRate: string;
  phone: string;
  email: string;
  description: string;
  installmentMode: InstallmentMode;
  singleDueDate: string;
  singleAmount: string;
  bulkCount: string;
  bulkStartDate: string;
  bulkAmount: string;
}

const DEFAULT_VALUES: DefaultValues = {
  borrower: '',
  amount: '',
  currency: Currency.PHP,
  installmentInterval: InstallmentInterval.MONTHLY,
  interestRate: '',
  phone: '',
  email: '',
  description: '',
  installmentMode: InstallmentType.SINGLE as InstallmentMode,
  singleDueDate: '',
  singleAmount: '',
  bulkCount: '1',
  bulkStartDate: '',
  bulkAmount: '',
};

interface CreateLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLoanDialog({ open, onOpenChange }: CreateLoanDialogProps) {
  const { mutateAsync, isPending } = useCreateLoan();

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      const loanPayload: Parameters<typeof mutateAsync>[0]['body'] = {
        borrower: value.borrower.trim(),
        amount: parseFloat(value.amount),
        currency: value.currency as (typeof CURRENCIES)[number],
        installmentInterval: value.installmentInterval as InstallmentInterval,
        interestRate: value.interestRate !== '' ? parseFloat(value.interestRate) : undefined,
        phone: value.phone.trim() || undefined,
        email: value.email.trim() || undefined,
        description: value.description.trim() || undefined,
        installments: buildInstallmentsPayload(value),
      };

      try {
        await mutateAsync({ body: loanPayload });
        toast.success('Loan created successfully.');
        form.reset();
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create loan.');
      }
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function renderSingleInstallmentFields() {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground">Single installment details</p>

        <form.Field
            name="singleDueDate"
            validators={{
            onChange: ({ value }) => {
              if (form.getFieldValue('installmentMode') !== InstallmentType.SINGLE) return undefined;
              return !value ? 'Due date is required' : undefined;
            },
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>
                Due Date <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>

        <form.Field
            name="singleAmount"
            validators={{
            onChange: ({ value }) => {
              if (form.getFieldValue('installmentMode') !== InstallmentType.SINGLE) return undefined;
              if (!value) return 'Amount is required';
              const parsed = parseFloat(value);
              if (isNaN(parsed) || parsed <= 0) return 'Must be a positive number';
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>
      </div>
    );
  }

  function renderBulkInstallmentFields() {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground">Bulk installment schedule</p>

        <div className="grid grid-cols-2 gap-3">
          <form.Field
              name="bulkCount"
              validators={{
              onChange: ({ value }) => {
                if (form.getFieldValue('installmentMode') !== InstallmentType.BULK) return undefined;
                const parsed = parseInt(value, 10);
                if (!value || isNaN(parsed) || parsed < 1 || parsed > 360)
                  return 'Count must be 1–360';
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
                    placeholder="e.g. 12"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                />
                <FieldError errors={toFieldErrors(field.state.meta.errors)} />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field
            name="bulkStartDate"
            validators={{
            onChange: ({ value }) => {
              if (form.getFieldValue('installmentMode') !== InstallmentType.BULK) return undefined;
              return !value ? 'Start date is required' : undefined;
            },
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>
                Start Date <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>

        <form.Field
            name="bulkAmount"
            validators={{
            onChange: ({ value }) => {
              if (form.getFieldValue('installmentMode') !== InstallmentType.BULK) return undefined;
              if (!value) return 'Amount is required';
              const parsed = parseFloat(value);
              if (isNaN(parsed) || parsed <= 0) return 'Must be a positive number';
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>
      </div>
    );
  }

  return (
    <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="New Loan"
        className="sm:max-w-lg"
        footer={(
        <>
          <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-loan-form" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Loan'}
          </Button>
        </>
      )}
    >
      <form
          id="create-loan-form"
          onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
          className="flex flex-col gap-4"
      >
          {/* Loan Info */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Loan Info
            </p>

            {/* Borrower */}
            <form.Field
                name="borrower"
                validators={{
                onChange: ({ value }) =>
                  !value.trim() ? 'Borrower name is required' : undefined,
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={field.name}>
                    Borrower <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                      id={field.name}
                      placeholder="Full name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                  />
                  <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>

            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <form.Field
                  name="amount"
                  validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'Amount is required';
                    const parsed = parseFloat(value);
                    if (isNaN(parsed) || parsed <= 0) return 'Must be a positive number';
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
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
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
                    <Select value={field.state.value} onValueChange={field.handleChange}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            </div>

            {/* Interest Rate */}
            <form.Field
                name="interestRate"
                validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  const parsed = parseFloat(value);
                  if (isNaN(parsed) || parsed < 0) return 'Must be 0 or greater';
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
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                  />
                  <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="phone">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                    <Input
                        id={field.name}
                        placeholder="+63 9XX XXX XXXX"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field
                  name="email"
                  validators={{
                  onChange: ({ value }) => {
                    if (!value.trim()) return undefined;
                    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                    return isValidEmail ? undefined : 'Invalid email address';
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                        id={field.name}
                        type="email"
                        placeholder="borrower@example.com"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                    />
                    <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
            </div>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Textarea
                      id={field.name}
                      placeholder="Optional notes about this loan..."
                      rows={2}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>
          </div>

          <Separator />

          {/* Installments */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Installments
            </p>

            <form.Field name="installmentMode">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Mode <span className="text-destructive">*</span></FieldLabel>
                  <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as InstallmentMode)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={InstallmentType.SINGLE}>Single installment</SelectItem>
                      <SelectItem value={InstallmentType.BULK}>Bulk installments</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="installmentInterval">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Interval <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={field.state.value} onValueChange={field.handleChange}>
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

            <form.Subscribe selector={(state) => state.values.installmentMode}>
              {(installmentMode) =>
                installmentMode === InstallmentType.BULK
                  ? renderBulkInstallmentFields()
                  : renderSingleInstallmentFields()
              }
            </form.Subscribe>
          </div>

      </form>
    </Modal>
  );
}

function buildInstallmentsPayload(value: DefaultValues) {
  if (value.installmentMode === InstallmentType.BULK) {
    return {
      type: InstallmentType.BULK as const,
      interval: value.installmentInterval as InstallmentInterval,
      count: parseInt(value.bulkCount, 10),
      startDate: value.bulkStartDate,
      amount: parseFloat(value.bulkAmount),
      status: InstallmentStatus.PENDING,
    };
  }

  return {
    type: InstallmentType.SINGLE as const,
    dueDate: value.singleDueDate,
    amount: parseFloat(value.singleAmount),
    status: InstallmentStatus.PENDING,
  };
}
