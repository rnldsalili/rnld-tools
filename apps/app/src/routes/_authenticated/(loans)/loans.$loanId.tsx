import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { CheckCircleIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  Pagination,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import { INSTALLMENTS_LIMIT, InstallmentStatus } from '@workspace/constants';
import type { ColumnDef } from '@tanstack/react-table';
import type { LoanInstallment } from '@/app/hooks/use-loan';
import {  useLoan } from '@/app/hooks/use-loan';
import { formatCurrency } from '@/app/lib/format';
import { AddInstallmentDialog } from '@/app/components/loans/add-installment-dialog';
import { EditInstallmentDialog } from '@/app/components/loans/edit-installment-dialog';
import { EditLoanDialog } from '@/app/components/loans/edit-loan-dialog';
import { InstallmentStatusBadge } from '@/app/components/loans/installment-status-badge';
import { MarkPaidDialog } from '@/app/components/loans/mark-paid-dialog';

export const Route = createFileRoute('/_authenticated/(loans)/loans/$loanId')({
  head: () => ({ meta: [{ title: 'RTools - Loan Detail' }] }),
  staticData: { title: 'Loan Detail' },
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { loanId } = Route.useParams();
  const [installmentsPage, setInstallmentsPage] = useState(1);
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null);
  const [markPaidInstallment, setMarkPaidInstallment] = useState<LoanInstallment | null>(null);
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);

  const { data, isLoading } = useLoan({
    loanId,
    page: installmentsPage,
    limit: INSTALLMENTS_LIMIT,
  });

  const loan = data?.data.loan;
  const installments = loan?.installments ?? [];
  const installmentsPagination = loan?.installmentsPagination;

  const columns: Array<ColumnDef<LoanInstallment>> = [
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => format(new Date(row.original.dueDate), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.amount, loan?.currency ?? 'PHP'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <InstallmentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'paidAt',
      header: 'Paid At',
      cell: ({ row }) =>
        row.original.paidAt ? (
          format(new Date(row.original.paidAt), 'MMM d, yyyy')
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
        <div className="flex items-center gap-1">
          {row.original.status !== InstallmentStatus.PAID && (
            <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setMarkPaidInstallment(row.original)}
            >
              <CheckCircleIcon className="size-3.5" />
              Mark as Paid
            </Button>
          )}
          <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setSelectedInstallment(row.original)}
          >
            <PencilIcon className="size-3.5" />
            Edit
          </Button>
        </div>
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
            <SectionCardHeader className="flex justify-between items-center">
              <span className="text-sm font-semibold">Loan Details</span>
              {loan && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIsEditLoanOpen(true)}
                >
                  <PencilIcon className="size-3.5" />
                  Edit
                </Button>
              )}
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
                getRowClassName={(row) => {
                  const isOverdue =
                    row.status === InstallmentStatus.PENDING &&
                    new Date(row.dueDate) < new Date();
                  return isOverdue ? 'bg-destructive/10 hover:bg-destructive/15' : undefined;
                }}
                toolbar={(
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Installments</span>
                    {!isLoading && installmentsPagination && (
                      <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                        {installmentsPagination.total}
                      </Badge>
                    )}
                  </div>
                  <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setIsAddInstallmentOpen(true)}
                      disabled={isLoading || !loan}
                  >
                    <PlusIcon className="size-3.5" />
                    Add Installment
                  </Button>
                </div>
              )}
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

      {/* Mark as Paid Dialog */}
      {markPaidInstallment && loan && (
        <MarkPaidDialog
            loanId={loanId}
            installment={markPaidInstallment}
            currency={loan.currency}
            onClose={() => setMarkPaidInstallment(null)}
        />
      )}

      {/* Add Installment Dialog */}
      {loan && (
        <AddInstallmentDialog
            loanId={loanId}
            open={isAddInstallmentOpen}
            onOpenChange={setIsAddInstallmentOpen}
        />
      )}

      {/* Edit Loan Dialog */}
      {isEditLoanOpen && loan && (
        <EditLoanDialog
            loan={loan}
            onClose={() => setIsEditLoanOpen(false)}
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
