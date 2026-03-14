import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Pagination,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  Input,
} from '@workspace/ui';
import { InstallmentStatus, INSTALLMENT_STATUSES } from '@workspace/constants';
import { useLoan, type LoanInstallment } from '@/app/hooks/use-loan';
import { useUpdateInstallment } from '@/app/hooks/use-update-installment';
import { formatCurrency } from '@/app/lib/format';

const INSTALLMENTS_LIMIT = 10;

const STATUS_STYLES: Record<string, string> = {
  [InstallmentStatus.PENDING]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  [InstallmentStatus.PAID]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  [InstallmentStatus.OVERDUE]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('border-0 font-medium', STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

export const Route = createFileRoute('/_authenticated/loans/$loanId')({
  head: () => ({ meta: [{ title: 'RTools - Loan Detail' }] }),
  staticData: { title: 'Loan Detail' },
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { loanId } = Route.useParams();
  const [installmentsPage, setInstallmentsPage] = useState(1);
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null);

  const { data, isLoading } = useLoan({
    loanId,
    page: installmentsPage,
    limit: INSTALLMENTS_LIMIT,
  });

  const loan = data?.data?.loan;
  const installments = loan?.installments ?? [];
  const installmentsPagination = loan?.installmentsPagination;

  const columns: ColumnDef<LoanInstallment>[] = [
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => format(new Date(row.original.dueDate), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.remarks ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setSelectedInstallment(row.original)}
        >
          <PencilIcon className="size-3.5" />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        {/* Side-by-side on lg+: loan details left, installments right */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Loan Details — card variant matching installments */}
          <SectionCard className="lg:w-96 lg:shrink-0">
            <SectionCardHeader>
              <span className="text-sm font-semibold">Loan Details</span>
            </SectionCardHeader>
            <SectionCardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ) : loan ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-2">
                    <LoanField label="Borrower" value={loan.borrower} />
                    <LoanField label="Amount" value={formatCurrency(loan.amount, loan.currency)} />
                    <LoanField
                      label="Interest Rate"
                      value={loan.interestRate != null ? `${loan.interestRate}%` : '—'}
                    />
                    <LoanField label="Phone" value={loan.phone ?? '—'} />
                    <LoanField label="Email" value={loan.email ?? '—'} />
                    <LoanField label="Created" value={format(new Date(loan.createdAt), 'MMM d, yyyy')} />
                    <LoanField label="Updated" value={format(new Date(loan.updatedAt), 'MMM d, yyyy')} />
                  </div>
                  {loan.description && (
                    <div className="border-t border-border pt-3">
                      <LoanField label="Description" value={loan.description} />
                    </div>
                  )}
                </div>
              ) : null}
            </SectionCardContent>
          </SectionCard>

          {/* Installments */}
          <div className="min-w-0 flex-1">
            <DataTable
              variant="card"
              columns={columns}
              data={installments}
              isLoading={isLoading}
              toolbar={
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Installments</span>
                  {!isLoading && installmentsPagination && (
                    <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                      {installmentsPagination.total}
                    </Badge>
                  )}
                </div>
              }
              footer={
                installmentsPagination && installmentsPagination.totalPages > 1 ? (
                  <Pagination
                    page={installmentsPage}
                    totalPages={installmentsPagination.totalPages}
                    onPageChange={setInstallmentsPage}
                    isLoading={isLoading}
                  />
                ) : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Edit Installment Dialog */}
      {selectedInstallment && (
        <EditInstallmentDialog
          loanId={loanId}
          installment={selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
        />
      )}
    </div>
  );
}

function LoanField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}

interface EditInstallmentDialogProps {
  loanId: string;
  installment: LoanInstallment;
  onClose: () => void;
}

function EditInstallmentDialog({ loanId, installment, onClose }: EditInstallmentDialogProps) {
  const { mutateAsync, isPending } = useUpdateInstallment();

  const form = useForm({
    defaultValues: {
      status: installment.status as string,
      dueDate: installment.dueDate,
      remarks: installment.remarks ?? '',
    },
    onSubmit: async ({ value }) => {
      await mutateAsync({
        loanId,
        installmentId: installment.id,
        body: {
          status: value.status as (typeof INSTALLMENT_STATUSES)[number],
          dueDate: value.dueDate,
          remarks: value.remarks || null,
        },
      });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Installment</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          {/* Status */}
          <form.Field name="status">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Status</Label>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {/* Due Date */}
          <form.Field name="dueDate">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Due Date</Label>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          {/* Remarks */}
          <form.Field name="remarks">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Remarks</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional remarks..."
                  rows={3}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
