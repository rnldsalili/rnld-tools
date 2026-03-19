import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button,
  Field,
  FieldLabel,
  Input,
  Modal,
} from '@workspace/ui';
import type { LoanInstallment } from '@/app/hooks/use-loan';
import { useMarkInstallmentPaid } from '@/app/hooks/use-loan';
import { formatCurrency } from '@/app/lib/format';

interface MarkPaidDialogProps {
  loanId: string;
  installment: LoanInstallment;
  currency: string;
  onClose: () => void;
}

export function MarkPaidDialog({ loanId, installment, currency, onClose }: MarkPaidDialogProps) {
  const { mutateAsync, isPending } = useMarkInstallmentPaid();

  const form = useForm({
    defaultValues: {
      paidAt: format(new Date(), 'yyyy-MM-dd'),
    },
    onSubmit: async ({ value }) => {
      try {
        await mutateAsync({
          loanId,
          installmentId: installment.id,
          body: {
            paidAt: value.paidAt || undefined,
          },
        });
        toast.success('Installment marked as paid.');
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
        title="Mark as Paid"
        className="sm:max-w-sm"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="mark-paid-form" disabled={isPending}>
            {isPending ? 'Saving...' : 'Mark as Paid'}
          </Button>
        </>
      )}
    >
      <form
          id="mark-paid-form"
          onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
          className="flex flex-col gap-4"
      >
        <div className="rounded-md border border-border bg-muted/40 p-3 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Installment</span>
          <span className="text-sm font-medium">
            {formatCurrency(installment.amount, currency)} — due {format(new Date(installment.dueDate), 'MMM d, yyyy')}
          </span>
        </div>

        <form.Field name="paidAt">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Paid Date</FieldLabel>
              <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
