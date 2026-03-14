import { useForm } from '@tanstack/react-form';
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Textarea,
} from '@workspace/ui';
import { useUpdateLoan } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';

interface LoanEditData {
  id: string;
  borrower: string;
  amount: number;
  interestRate: number | null;
  phone: string | null;
  email: string | null;
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
      borrower: loan.borrower,
      amount: String(loan.amount),
      interestRate: loan.interestRate != null ? String(loan.interestRate) : '',
      phone: loan.phone ?? '',
      email: loan.email ?? '',
      description: loan.description ?? '',
    },
    onSubmit: async ({ value }) => {
      await mutateAsync({
        loanId: loan.id,
        body: {
          borrower: value.borrower,
          amount: parseFloat(value.amount),
          interestRate: value.interestRate !== '' ? parseFloat(value.interestRate) : null,
          phone: value.phone || null,
          email: value.email || null,
          description: value.description || null,
        },
      });
      onClose();
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
            name="borrower"
            validators={{
            onChange: ({ value }) => (!value.trim() ? 'Borrower is required' : undefined),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Borrower</FieldLabel>
              <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Borrower name"
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
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
              <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
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

        <form.Field name="phone">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
              <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional"
              />
            </Field>
          )}
        </form.Field>

        <form.Field
            name="email"
            validators={{
            onChange: ({ value }) => {
              if (!value) return undefined;
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(value) ? undefined : 'Invalid email address';
            },
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Optional"
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
