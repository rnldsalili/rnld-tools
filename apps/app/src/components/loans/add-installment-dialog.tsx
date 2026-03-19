import { useForm } from '@tanstack/react-form';
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
import { useAddInstallment } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';

interface AddInstallmentDialogProps {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInstallmentDialog({ loanId, open, onOpenChange }: AddInstallmentDialogProps) {
  const { mutateAsync, isPending } = useAddInstallment();

  const form = useForm({
    defaultValues: {
      dueDate: '',
      amount: '',
      remarks: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await mutateAsync({
          loanId,
          body: {
            dueDate: value.dueDate,
            amount: parseFloat(value.amount),
            remarks: value.remarks || null,
          },
        });
        toast.success('Installment added successfully.');
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  return (
    <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Add Installment"
        className="sm:max-w-md"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="add-installment-form" disabled={isPending}>
            {isPending ? 'Adding...' : 'Add Installment'}
          </Button>
        </>
      )}
    >
      <form
          id="add-installment-form"
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
