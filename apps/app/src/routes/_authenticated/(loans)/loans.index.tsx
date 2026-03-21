import { Link, createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { HandCoinsIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { LOANS_LIMIT } from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { Button, DataTable, Input, Pagination } from '@workspace/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type { LoanListItem } from '@/app/hooks/use-loan';
import { CreateLoanDialog } from '@/app/components/loans/create-loan-dialog';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useLoans } from '@/app/hooks/use-loan';
import { formatCurrency } from '@/app/lib/format';

export const Route = createFileRoute('/_authenticated/(loans)/loans/')({
  head: () => ({ meta: [{ title: 'RTools - Loans' }] }),
  component: LoansPage,
});

function LoansPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput);

  const { data, isLoading } = useLoans({
    search: debouncedSearch,
    page,
    limit: LOANS_LIMIT,
  });

  const loans = data?.data.loans ?? [];
  const totalPages = data?.data.pagination.totalPages ?? 1;
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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    setPage(1);
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
      <DataTable
          columns={columns}
          data={loans}
          isLoading={isLoading}
          variant="embedded"
          footer={(
            <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                isLoading={isLoading}
            />
          )}
      />
      <Can I={PermissionAction.CREATE} a={PermissionModule.LOANS}>
        <CreateLoanDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </Can>
    </AuthenticatedListPageShell>
  );
}
