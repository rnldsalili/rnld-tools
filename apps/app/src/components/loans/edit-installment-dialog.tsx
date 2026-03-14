import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import {
  Button,
  Field,
  FieldLabel,
  FieldError,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@workspace/ui';
import { INSTALLMENT_STATUS_LABELS, INSTALLMENT_STATUSES } from '@workspace/constants';
import { useUpdateInstallment, type LoanInstallment } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';

interface EditInstallmentDialogProps {
  loanId: string;
  installment: LoanInstallment;
  onClose: () => void;
}

export function EditInstallmentDialog({ loanId, installment, onClose }: EditInstallmentDialogProps) {
  const { mutateAsync, isPending } = useUpdateInstallment();

  const form = useForm({
    defaultValues: {
      status: installment.status as string,
      dueDate: format(new Date(installment.dueDate), 'yyyy-MM-dd'),
      amount: String(installment.amount),
      remarks: installment.remarks ?? '',
    },
    onSubmit: async ({ value }) => {
      await mutateAsync({
        loanId,
        installmentId: installment.id,
        body: {
          status: value.status as (typeof INSTALLMENT_STATUSES)[number],
          dueDate: value.dueDate,
          amount: parseFloat(value.amount),
          remarks: value.remarks || null,
        },
      });
      onClose();
    },
  });

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Edit Installment"
      className="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-installment-form" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        id="edit-installment-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Status</FieldLabel>
              <Select value={field.state.value} onValueChange={field.handleChange}>
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {INSTALLMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {INSTALLMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="dueDate"
          validators={{
            onChange: ({ value }) => (!value ? 'Due date is required' : undefined),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Due Date</FieldLabel>
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
