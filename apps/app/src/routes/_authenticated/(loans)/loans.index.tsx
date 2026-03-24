import { Link, createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { HandCoinsIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { LOANS_LIMIT } from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { Badge, Button, DataTable, Input, Pagination, cn } from '@workspace/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type { AttentionInstallmentCategory, LoanAttentionInstallment, LoanListItem } from '@/app/hooks/use-loan';
import { CreateLoanDialog } from '@/app/components/loans/create-loan-dialog';
import { InstallmentStatusBadge } from '@/app/components/loans/installment-status-badge';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useAttentionInstallments, useLoans } from '@/app/hooks/use-loan';
import { formatCurrency } from '@/app/lib/format';

export const Route = createFileRoute('/_authenticated/(loans)/loans/')({
  head: () => ({ meta: [{ title: 'RTools - Loans' }] }),
  component: LoansPage,
});

function LoansPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [attentionPage, setAttentionPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput);

  const { data, isLoading } = useLoans({
    search: debouncedSearch,
    page,
    limit: LOANS_LIMIT,
  });
  const { data: attentionData, isLoading: isAttentionLoading } = useAttentionInstallments({
    search: debouncedSearch,
    page: attentionPage,
    limit: LOANS_LIMIT,
  });

  const loans = data?.data.loans ?? [];
  const totalLoans = data?.data.pagination.total ?? 0;
  const totalPages = data?.data.pagination.totalPages ?? 1;
  const attentionInstallments = attentionData?.data.installments ?? [];
  const totalAttentionInstallments = attentionData?.data.pagination.total ?? 0;
  const attentionTotalPages = attentionData?.data.pagination.totalPages ?? 1;
  const canViewLoans = useCan(PermissionModule.LOANS, PermissionAction.VIEW);

  if (!canViewLoans) {
    return (
      <UnauthorizedState
          title="Loans Restricted"
          description="You do not have permission to view loans."
      />
    );
  }

  const columns: Array<ColumnDef<LoanListItem>> = [
    {
      accessorKey: 'client.name',
      header: 'Client',
      cell: ({ row }) => <span className="font-medium">{row.original.client.name}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.original.description?.trim() || '—',
    },
    {
      accessorKey: 'interestRate',
      header: 'Interest Rate',
      cell: ({ row }) =>
        row.original.interestRate != null ? `${row.original.interestRate}%` : '—',
    },
    {
      id: 'installments',
      header: 'Installments',
      cell: ({ row }) => (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {row.original.paidInstallmentsCount}/{row.original._count.installments}
        </span>
      ),
    },
    {
      accessorKey: 'loanDate',
      header: 'Loan Date',
      cell: ({ row }) => format(new Date(row.original.loanDate), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <Link
              to="/loans/$loanId"
              params={{ loanId: row.original.id }}
              className="font-medium text-foreground transition-colors hover:text-primary"
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  const attentionColumns: Array<ColumnDef<LoanAttentionInstallment>> = [
    {
      accessorKey: 'client.name',
      header: 'Client',
      cell: ({ row }) => <span className="font-medium">{row.original.client.name}</span>,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => format(new Date(row.original.dueDate), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'remainingAmount',
      header: 'Remaining',
      cell: ({ row }) => formatCurrency(row.original.remainingAmount, row.original.currency),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <InstallmentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'attentionCategory',
      header: 'Attention',
      cell: ({ row }) => <AttentionCategoryBadge category={row.original.attentionCategory} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <Link
              to="/loans/$loanId"
              params={{ loanId: row.original.loanId }}
              className="font-medium text-foreground transition-colors hover:text-primary"
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    setPage(1);
    setAttentionPage(1);
  }

  return (
    <AuthenticatedListPageShell
        icon={HandCoinsIcon}
        title="Loans"
        description="Manage client loans and installments."
        action={(
        <Can I={PermissionAction.CREATE} a={PermissionModule.LOANS}>
          <Button className="gap-1.5" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="size-3.5" />
            New Loan
          </Button>
        </Can>
      )}
        controls={(
        <Input
            placeholder="Search by client..."
            value={searchInput}
            onChange={handleSearchChange}
            className="max-w-sm bg-background"
        />
      )}
    >
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DataTable
              columns={columns}
              data={loans}
              isLoading={isLoading}
              variant="card"
              toolbar={(
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">All Loans</span>
                    <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                      {totalLoans}
                    </Badge>
                  </div>
                </div>
              )}
              footer={(
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    isLoading={isLoading}
                />
              )}
          />
        </div>

        <div className="min-w-0">
          <DataTable
              columns={attentionColumns}
              data={attentionInstallments}
              isLoading={isAttentionLoading}
              variant="card"
              getRowClassName={(row) => getAttentionRowClassName(row.attentionCategory)}
              toolbar={(
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Installments Requiring Attention</span>
                    <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                      {totalAttentionInstallments}
                    </Badge>
                  </div>
                </div>
              )}
              footer={(
                <Pagination
                    page={attentionPage}
                    totalPages={attentionTotalPages}
                    onPageChange={setAttentionPage}
                    isLoading={isAttentionLoading}
                />
              )}
          />
        </div>
      </div>
      <Can I={PermissionAction.CREATE} a={PermissionModule.LOANS}>
        <CreateLoanDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </Can>
    </AuthenticatedListPageShell>
  );
}

function AttentionCategoryBadge({ category }: { category: AttentionInstallmentCategory }) {
  return (
    <Badge
        className={cn(
        'border-0 font-medium',
        category === 'overdue'
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      )}
    >
      {category === 'overdue' ? 'Past Due' : 'Near Due'}
    </Badge>
  );
}

function getAttentionRowClassName(category: AttentionInstallmentCategory) {
  return category === 'overdue'
    ? 'bg-destructive/10 hover:bg-destructive/15'
    : 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/15 dark:hover:bg-amber-950/25';
}
