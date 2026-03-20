import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Textarea,
} from '@workspace/ui';
import type { LoanInstallment } from '@/app/hooks/use-loan';
import {  useUpdateInstallment } from '@/app/hooks/use-loan';
import { toStartOfDayIso } from '@/app/lib/date';
import { toFieldErrors } from '@/app/lib/form';

interface EditInstallmentDialogProps {
  loanId: string;
  installment: LoanInstallment;
  onClose: () => void;
}

export function EditInstallmentDialog({ loanId, installment, onClose }: EditInstallmentDialogProps) {
  const { mutateAsync, isPending } = useUpdateInstallment();
  const isAmountLocked = installment.paidAmount > 0 || installment.paymentCount > 0;

  const form = useForm({
    defaultValues: {
      dueDate: format(new Date(installment.dueDate), 'yyyy-MM-dd'),
      amount: String(installment.amount),
      remarks: installment.remarks ?? '',
    },
    onSubmit: async ({ value }) => {
      try {
        await mutateAsync({
          loanId,
          installmentId: installment.id,
          body: {
            dueDate: toStartOfDayIso(value.dueDate),
            amount: parseFloat(value.amount),
            remarks: value.remarks || null,
          },
        });
        toast.success('Installment updated successfully.');
        onClose();
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
  });

  return (
    <Modal
        open
        onOpenChange={(open) => { if (!open) onClose(); }}
        title="Edit Installment"
        className="sm:max-w-md"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-installment-form" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </>
      )}
    >
      <form
          id="edit-installment-form"
          onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
          className="flex flex-col gap-4"
      >
        <form.Field
            name="dueDate"
            validators={{
            onChange: ({ value }) => (!value ? 'Due date is required' : undefined),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Due Date <span className="text-destructive">*</span></FieldLabel>
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

        {isAmountLocked ? (
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <Input value={fieldlessAmount(installment.amount)} disabled />
            <p className="text-xs text-muted-foreground">
              Amount changes are locked once payment activity has been recorded for this installment.
            </p>
          </Field>
        ) : (
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
        )}

        <form.Field name="remarks">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Remarks</FieldLabel>
              <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional remarks..."
                  rows={3}
              />
            </Field>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}

function fieldlessAmount(amount: number) {
  return String(amount);
}
