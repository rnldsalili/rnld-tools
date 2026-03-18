import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import {
  INSTALLMENT_INTERVAL_LABELS,
  INSTALLMENT_INTERVAL_VALUES,
} from '@workspace/constants';
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
  Textarea,
} from '@workspace/ui';
import type { ClientStatus } from '@workspace/constants';
import { ClientSelector } from '@/app/components/loans/client-selector';
import { useUpdateLoan } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';
import { isOneOf } from '@/app/lib/value-guards';

interface LoanEditData {
  client: {
    address: string | null;
    email: string | null;
    id: string;
    name: string;
    phone: string | null;
    status: ClientStatus;
  };
  id: string;
  amount: number;
  installmentInterval: string;
  loanDate: string;
  interestRate: number | null;
  description: string | null;
}

interface EditLoanDialogProps {
  loan: LoanEditData;
  onClose: () => void;
}

export function EditLoanDialog({ loan, onClose }: EditLoanDialogProps) {
  const { mutateAsync, isPending } = useUpdateLoan();

  const form = useForm({
    defaultValues: {
      clientId: loan.client.id,
      amount: String(loan.amount),
      installmentInterval: loan.installmentInterval,
      loanDate: loan.loanDate.slice(0, 10),
      interestRate: loan.interestRate != null ? String(loan.interestRate) : '',
      description: loan.description ?? '',
    },
    onSubmit: async ({ value }) => {
      try {
        if (!isOneOf(INSTALLMENT_INTERVAL_VALUES, value.installmentInterval)) {
          throw new Error('Invalid installment interval.');
        }

        await mutateAsync({
          loanId: loan.id,
          body: {
            clientId: value.clientId,
            amount: parseFloat(value.amount),
            installmentInterval: value.installmentInterval,
            loanDate: value.loanDate,
            interestRate: value.interestRate !== '' ? parseFloat(value.interestRate) : null,
            description: value.description || null,
          },
        });
        toast.success('Loan updated successfully.');
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update loan.');
      }
    },
  });

  return (
    <Modal
        open
        onOpenChange={(open) => { if (!open) onClose(); }}
        title="Edit Loan"
        className="sm:max-w-md"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-loan-form" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </>
      )}
    >
      <form
          id="edit-loan-form"
          onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
          className="flex flex-col gap-4"
      >
        <form.Field
            name="clientId"
            validators={{
            onChange: ({ value }) => (!value ? 'Client is required' : undefined),
          }}
        >
          {(field) => (
            <ClientSelector
                clientId={field.state.value}
                currentClient={loan.client}
                errors={field.state.meta.errors}
                onChange={field.handleChange}
            />
          )}
        </form.Field>

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
              <FieldLabel htmlFor={field.name}>Amount <span className="text-destructive">*</span></FieldLabel>
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

        <form.Field name="installmentInterval">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Installment Interval <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (isOneOf(INSTALLMENT_INTERVAL_VALUES, value)) {
                      field.handleChange(value);
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
            name="loanDate"
            validators={{
            onChange: ({ value }) => (!value ? 'Loan date is required' : undefined),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Loan Date <span className="text-destructive">*</span></FieldLabel>
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
            name="interestRate"
            validators={{
            onChange: ({ value }) => {
              if (value === '') return undefined;
              const parsed = parseFloat(value);
              if (isNaN(parsed) || parsed < 0) return 'Must be a non-negative number';
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
                  placeholder="Optional"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
              />
            </Field>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
