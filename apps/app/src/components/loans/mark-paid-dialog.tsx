import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Switch,
  Textarea,
} from '@workspace/ui';
import type { LoanInstallment } from '@/app/hooks/use-loan';
import { useRecordInstallmentPayment } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';
import { formatCurrency } from '@/app/lib/format';

interface RecordPaymentDialogProps {
  currency: string;
  excessBalance: number;
  installment: LoanInstallment;
  loanId: string;
  onClose: () => void;
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function getNumericValue(value: string) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function RecordPaymentDialog({
  currency,
  excessBalance,
  installment,
  loanId,
  onClose,
}: RecordPaymentDialogProps) {
  const { mutateAsync, isPending } = useRecordInstallmentPayment();

  const form = useForm({
    defaultValues: {
      applyAvailableExcess: false,
      cashAmount: '',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      remarks: '',
    },
    onSubmit: async ({ value }) => {
      const cashAmount = getNumericValue(value.cashAmount);

      try {
        await mutateAsync({
          loanId,
          installmentId: installment.id,
          body: {
            paymentDate: value.paymentDate,
            cashAmount,
            applyAvailableExcess: value.applyAvailableExcess,
            remarks: value.remarks || null,
          },
        });
        toast.success('Payment recorded successfully.');
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to record payment.');
      }
    },
  });

  return (
    <Modal
        open
        onOpenChange={(open) => { if (!open) onClose(); }}
        title="Record Payment"
        className="sm:max-w-lg"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="record-payment-form" disabled={isPending}>
            {isPending ? 'Saving...' : 'Record Payment'}
          </Button>
        </>
      )}
    >
      <form
          id="record-payment-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
      >
        <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2">
          <PaymentSummaryItem label="Installment Amount" value={formatCurrency(installment.amount, currency)} />
          <PaymentSummaryItem label="Paid So Far" value={formatCurrency(installment.paidAmount, currency)} />
          <PaymentSummaryItem label="Remaining" value={formatCurrency(installment.remainingAmount, currency)} />
          <PaymentSummaryItem label="Available Excess" value={formatCurrency(excessBalance, currency)} />
        </div>

        <form.Field
            name="cashAmount"
            validators={{
              onChange: ({ value }) => {
                if (!value && !form.getFieldValue('applyAvailableExcess')) {
                  return 'Enter an amount or enable excess usage.';
                }

                if (!value) {
                  return undefined;
                }

                const parsedValue = Number.parseFloat(value);
                if (!Number.isFinite(parsedValue) || parsedValue < 0) {
                  return 'Enter a valid amount.';
                }

                return undefined;
              },
            }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>Cash Amount</FieldLabel>
              <Input
                  id={field.name}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
              />
              <FieldDescription>
                Enter the borrower payment amount for this entry. Excess is applied separately.
              </FieldDescription>
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>

        <form.Field name="paymentDate">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Payment Date</FieldLabel>
              <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="applyAvailableExcess">
          {(field) => (
            <Field>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor={field.name}>Apply Available Excess</FieldLabel>
                  <FieldDescription>
                    Use up to {formatCurrency(excessBalance, currency)} from the current loan excess balance.
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

        <form.Field name="remarks">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Remarks</FieldLabel>
              <Textarea
                  id={field.name}
                  rows={3}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional remarks for this payment..."
              />
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => ({
          applyAvailableExcess: state.values.applyAvailableExcess,
          cashAmount: state.values.cashAmount,
        })}
        >
          {({ applyAvailableExcess, cashAmount }) => {
            const numericCashAmount = getNumericValue(cashAmount);
            const excessAppliedAmount = applyAvailableExcess
              ? Math.min(excessBalance, installment.remainingAmount)
              : 0;
            const remainingAfterExcess = Math.max(0, installment.remainingAmount - excessAppliedAmount);
            const cashAppliedAmount = Math.min(numericCashAmount, remainingAfterExcess);
            const excessCreatedAmount = Math.max(0, numericCashAmount - cashAppliedAmount);
            const remainingAmountAfterPayment = roundAmount(
              Math.max(0, remainingAfterExcess - cashAppliedAmount),
            );
            const excessBalanceAfterPayment = roundAmount(
              excessBalance - excessAppliedAmount + excessCreatedAmount,
            );
            const totalAppliedAmount = roundAmount(excessAppliedAmount + cashAppliedAmount);

            return (
              <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
                <PaymentSummaryItem label="Cash Applied" value={formatCurrency(cashAppliedAmount, currency)} />
                <PaymentSummaryItem label="Excess Used" value={formatCurrency(excessAppliedAmount, currency)} />
                <PaymentSummaryItem label="New Excess" value={formatCurrency(excessCreatedAmount, currency)} />
                <PaymentSummaryItem label="Total Applied" value={formatCurrency(totalAppliedAmount, currency)} />
                <PaymentSummaryItem label="Remaining After" value={formatCurrency(remainingAmountAfterPayment, currency)} />
                <PaymentSummaryItem label="Excess After" value={formatCurrency(excessBalanceAfterPayment, currency)} />
              </div>
            );
          }}
        </form.Subscribe>
      </form>
    </Modal>
  );
}

function PaymentSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
