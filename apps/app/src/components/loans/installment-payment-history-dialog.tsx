import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Modal,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@workspace/ui';
import type { InstallmentPayment, LoanInstallment } from '@/app/hooks/use-loan';
import { useInstallmentPayments, useVoidInstallmentPayment } from '@/app/hooks/use-loan';
import { toFieldErrors } from '@/app/lib/form';
import { formatCurrency } from '@/app/lib/format';

const INSTALLMENT_PAYMENTS_LIMIT = 10;

interface InstallmentPaymentHistoryDialogProps {
  canVoidPayments: boolean;
  currency: string;
  installment: LoanInstallment;
  loanId: string;
  onClose: () => void;
}

export function InstallmentPaymentHistoryDialog({
  canVoidPayments,
  currency,
  installment,
  loanId,
  onClose,
}: InstallmentPaymentHistoryDialogProps) {
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentPendingVoid, setPaymentPendingVoid] = useState<InstallmentPayment | null>(null);
  const { data, isLoading } = useInstallmentPayments({
    loanId,
    installmentId: installment.id,
    page: paymentsPage,
    limit: INSTALLMENT_PAYMENTS_LIMIT,
  });
  const { mutateAsync, isPending } = useVoidInstallmentPayment();

  const payments = data?.data.payments ?? [];
  const pagination = data?.data.pagination;

  const voidForm = useForm({
    defaultValues: { voidReason: '' },
    onSubmit: async ({ value }) => {
      if (!paymentPendingVoid) {
        return;
      }

      try {
        await mutateAsync({
          loanId,
          installmentId: installment.id,
          paymentId: paymentPendingVoid.id,
          body: {
            voidReason: value.voidReason,
          },
        });
        toast.success('Payment voided successfully.');
        setPaymentPendingVoid(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to void payment.');
      }
    },
  });

  return (
    <>
      <Modal
          open
          onOpenChange={(open) => { if (!open) onClose(); }}
          title="Payment History"
          className="sm:max-w-4xl"
          footer={(
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-3">
            <SummaryItem label="Installment Amount" value={formatCurrency(installment.amount, currency)} />
            <SummaryItem label="Paid Amount" value={formatCurrency(installment.paidAmount, currency)} />
            <SummaryItem label="Remaining" value={formatCurrency(installment.remainingAmount, currency)} />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Cash</TableHead>
                  <TableHead>Excess Used</TableHead>
                  <TableHead>New Excess</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : payments.length > 0 ? (
                  payments.map((payment: InstallmentPayment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{formatCurrency(payment.cashAmount, currency)}</TableCell>
                      <TableCell>{formatCurrency(payment.excessAppliedAmount, currency)}</TableCell>
                      <TableCell>{formatCurrency(payment.excessCreatedAmount, currency)}</TableCell>
                      <TableCell>{formatCurrency(payment.appliedAmount, currency)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{payment.createdBy.name || 'System'}</span>
                          <span className="text-xs text-muted-foreground">{payment.createdBy.email || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.voidedAt ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">Voided</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(payment.voidedAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canVoidPayments && payment.canVoid ? (
                          <Button
                              type="button"
                              variant="ghost"
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => {
                                voidForm.reset();
                                setPaymentPendingVoid(payment);
                              }}
                          >
                            Void
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {payment.voidedAt ? 'Voided' : canVoidPayments ? 'Latest payment only' : 'View only'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No payments recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <Pagination
                page={paymentsPage}
                totalPages={pagination.totalPages}
                onPageChange={setPaymentsPage}
                isLoading={isLoading}
            />
          ) : null}
        </div>
      </Modal>

      {paymentPendingVoid ? (
        <Modal
            open
            onOpenChange={(open) => {
              if (!open && !isPending) {
                setPaymentPendingVoid(null);
              }
            }}
            title="Void Payment"
            className="sm:max-w-md"
            footer={(
            <>
              <Button type="button" variant="outline" onClick={() => setPaymentPendingVoid(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form="void-payment-form" disabled={isPending}>
                {isPending ? 'Voiding...' : 'Void Payment'}
              </Button>
            </>
          )}
        >
          <form
              id="void-payment-form"
              onSubmit={(event) => {
                event.preventDefault();
                voidForm.handleSubmit();
              }}
              className="flex flex-col gap-4"
          >
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                {formatCurrency(paymentPendingVoid.appliedAmount, currency)} recorded on{' '}
                {format(new Date(paymentPendingVoid.paymentDate), 'MMM d, yyyy')}
              </div>
              <div className="mt-1 text-muted-foreground">
                Only the latest active payment on the loan can be voided.
              </div>
            </div>

            <voidForm.Field
                name="voidReason"
                validators={{
                  onChange: ({ value }) => (!value.trim() ? 'A void reason is required.' : undefined),
                }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={field.name}>Void Reason</FieldLabel>
                  <Textarea
                      id={field.name}
                      rows={3}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Explain why this payment is being voided..."
                  />
                  <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </voidForm.Field>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function SummaryItem({
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
