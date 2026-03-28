import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { BarChart3Icon, HandCoinsIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { LOANS_LIMIT } from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { Badge, Button, DataTable, HorizontalTabs, Input, Pagination, cn } from '@workspace/ui';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  AttentionInstallmentCategory,
  LoanAttentionInstallment,
  LoanListItem,
  LoanPaidInstallment,
} from '@/app/hooks/use-loan';
import { InstallmentStatusBadge } from '@/app/components/loans/installment-status-badge';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useAttentionInstallments, useLatestPaidInstallments, useLoans } from '@/app/hooks/use-loan';
import { formatCurrency } from '@/app/lib/format';

const LOANS_TABS = ['all', 'review', 'latest-payments'] as const;

type LoansTab = typeof LOANS_TABS[number];

function isLoansTab(value: string): value is LoansTab {
  return LOANS_TABS.includes(value as LoansTab);
}

export const Route = createFileRoute('/_authenticated/(loans)/loans/')({
  head: () => ({ meta: [{ title: 'RTools - Loans' }] }),
  validateSearch: z.object({
    tab: z.enum(LOANS_TABS).optional(),
  }),
  component: LoansPage,
});

function LoansPage() {
  const router = useRouter();
  const { tab = 'all' } = Route.useSearch();
  const [searchInput, setSearchInput] = useState('');
  const [allLoansPage, setAllLoansPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [latestPaymentsPage, setLatestPaymentsPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput);
  const activeTab = tab;

  const { data, isLoading } = useLoans({
    search: debouncedSearch,
    page: allLoansPage,
    limit: LOANS_LIMIT,
    enabled: activeTab === 'all',
  });
  const { data: attentionData, isLoading: isAttentionLoading } = useAttentionInstallments({
    search: debouncedSearch,
    page: reviewPage,
    limit: LOANS_LIMIT,
    enabled: activeTab === 'review',
  });
  const { data: latestPaymentsData, isLoading: isLatestPaymentsLoading } = useLatestPaidInstallments({
    search: debouncedSearch,
    page: latestPaymentsPage,
    limit: LOANS_LIMIT,
    enabled: activeTab === 'latest-payments',
  });

  const loans = data?.data.loans ?? [];
  const totalLoans = data?.data.pagination.total ?? 0;
  const allLoansTotalPages = data?.data.pagination.totalPages ?? 1;
  const attentionInstallments = attentionData?.data.installments ?? [];
  const totalAttentionInstallments = attentionData?.data.pagination.total ?? 0;
  const reviewTotalPages = attentionData?.data.pagination.totalPages ?? 1;
  const latestPaidInstallments = latestPaymentsData?.data.installments ?? [];
  const totalLatestPayments = latestPaymentsData?.data.pagination.total ?? 0;
  const latestPaymentsTotalPages = latestPaymentsData?.data.pagination.totalPages ?? 1;
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

  const latestPaymentsColumns: Array<ColumnDef<LoanPaidInstallment>> = [
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
      accessorKey: 'paidAmount',
      header: 'Paid',
      cell: ({ row }) => formatCurrency(row.original.paidAmount, row.original.currency),
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
      accessorKey: 'paidByUser.name',
      header: 'Paid By',
      cell: ({ row }) => row.original.paidByUser.name || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <InstallmentStatusBadge status={row.original.status} />,
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
    setAllLoansPage(1);
    setReviewPage(1);
    setLatestPaymentsPage(1);
  }

  function handleTabChange(nextTab: string) {
    if (!isLoansTab(nextTab)) {
      return;
    }

    void router.navigate({
      to: Route.to,
      search: (previousSearch) => ({
        ...previousSearch,
        tab: nextTab,
      }),
      replace: true,
    });
  }

  return (
    <AuthenticatedListPageShell
        icon={HandCoinsIcon}
        title="Loans"
        description="Manage client loans and installments."
        action={(
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/loans/analytics">
              <BarChart3Icon data-icon="inline-start" />
              Analytics
            </Link>
          </Button>
          <Can I={PermissionAction.CREATE} a={PermissionModule.LOANS}>
            <Button asChild>
              <Link to="/loans/new">
              <PlusIcon data-icon="inline-start" />
              New Loan
              </Link>
            </Button>
          </Can>
        </div>
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
      <div className="grid min-w-0 gap-3 p-2 sm:gap-4 sm:p-5">
        <HorizontalTabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="min-w-0"
            listClassName="-mx-1 px-1 sm:mx-0 sm:px-0"
            contentClassName="min-w-0"
            items={[
              {
                value: 'all',
                label: 'All Loans',
                content: (
                  <div className="min-w-0">
                    <DataTable
                        columns={columns}
                        data={loans}
                        isLoading={isLoading}
                        variant="card"
                        toolbar={(
                          <div className="flex w-full flex-wrap items-center gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold">All Loans</span>
                              <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                                {totalLoans}
                              </Badge>
                            </div>
                          </div>
                        )}
                        footer={(
                          <Pagination
                              page={allLoansPage}
                              totalPages={allLoansTotalPages}
                              onPageChange={setAllLoansPage}
                              isLoading={isLoading}
                          />
                        )}
                    />
                  </div>
                ),
              },
              {
                value: 'review',
                label: 'Items Requiring Review',
                content: (
                  <div className="min-w-0">
                    <DataTable
                        columns={attentionColumns}
                        data={attentionInstallments}
                        isLoading={isAttentionLoading}
                        variant="card"
                        getRowClassName={(row) => getAttentionRowClassName(row.attentionCategory)}
                        toolbar={(
                          <div className="flex w-full flex-wrap items-center gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold">Items Requiring Review</span>
                              <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                                {totalAttentionInstallments}
                              </Badge>
                            </div>
                          </div>
                        )}
                        footer={(
                          <Pagination
                              page={reviewPage}
                              totalPages={reviewTotalPages}
                              onPageChange={setReviewPage}
                              isLoading={isAttentionLoading}
                          />
                        )}
                    />
                  </div>
                ),
              },
              {
                value: 'latest-payments',
                label: 'Latest Payments',
                content: (
                  <div className="min-w-0">
                    <DataTable
                        columns={latestPaymentsColumns}
                        data={latestPaidInstallments}
                        isLoading={isLatestPaymentsLoading}
                        variant="card"
                        toolbar={(
                          <div className="flex w-full flex-wrap items-center gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold">Latest Payments</span>
                              <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                                {totalLatestPayments}
                              </Badge>
                            </div>
                          </div>
                        )}
                        footer={(
                          <Pagination
                              page={latestPaymentsPage}
                              totalPages={latestPaymentsTotalPages}
                              onPageChange={setLatestPaymentsPage}
                              isLoading={isLatestPaymentsLoading}
                          />
                        )}
                    />
                  </div>
                ),
              },
            ]}
        />
      </div>
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
