import { createFileRoute, Link } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { HandCoinsIcon, EyeIcon } from 'lucide-react';
import { useState } from 'react';
import { Button, DataTable, Input, Pagination } from '@workspace/ui';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useLoans, type LoanListItem } from '@/app/hooks/use-loans';
import { formatCurrency } from '@/app/lib/format';

const LOANS_LIMIT = 10;

const columns: ColumnDef<LoanListItem>[] = [
  {
    accessorKey: 'borrower',
    header: 'Borrower',
    cell: ({ row }) => <span className="font-medium">{row.original.borrower}</span>,
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
        {row.original._count.installments}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM d, yyyy'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link to="/loans/$loanId" params={{ loanId: row.original.id }}>
          <EyeIcon className="size-3.5" />
          View
        </Link>
      </Button>
    ),
  },
];

export const Route = createFileRoute('/_authenticated/(loans)/loans/')({
  head: () => ({ meta: [{ title: 'RTools - Loans' }] }),
  component: LoansPage,
});

function LoansPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput);

  const { data, isLoading } = useLoans({
    search: debouncedSearch,
    page,
    limit: LOANS_LIMIT,
  });

  const loans = data?.data?.loans ?? [];
  const totalPages = data?.data?.pagination?.totalPages ?? 1;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3">
        <DataTable
          variant="card"
          columns={columns}
          data={loans}
          isLoading={isLoading}
          toolbar={
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HandCoinsIcon className="size-3.5" />
                </span>
                <div>
                  <h1 className="text-sm font-semibold leading-tight">Loans</h1>
                  <p className="text-xs text-muted-foreground">Manage borrower loans and installments.</p>
                </div>
              </div>
              <Input
                placeholder="Search by borrower..."
                value={searchInput}
                onChange={handleSearchChange}
                className="max-w-xs"
              />
            </div>
          }
          footer={
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={isLoading}
            />
          }
        />
      </div>
    </div>
  );
}
