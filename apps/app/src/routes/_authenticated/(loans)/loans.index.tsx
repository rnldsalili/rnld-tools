import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { BarChart3Icon, HandCoinsIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { LOANS_LIMIT } from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@workspace/ui';
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
  const allLoansTotalPages = data?.data.pagination.totalPages ?? 1;
  const attentionInstallments = attentionData?.data.installments ?? [];
  const reviewTotalPages = attentionData?.data.pagination.totalPages ?? 1;
  const latestPaidInstallments = latestPaymentsData?.data.installments ?? [];
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
    <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0">
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
          <div className="flex min-w-0 flex-col gap-3">
            <TabsList className="-mx-1 flex w-full max-w-full justify-start gap-1 overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:w-fit sm:justify-center sm:px-0">
              <TabsTrigger value="all" className="shrink-0 px-3 py-1.5 text-sm">
                All Loans
              </TabsTrigger>
              <TabsTrigger value="review" className="shrink-0 px-3 py-1.5 text-sm">
                Items Requiring Review
              </TabsTrigger>
              <TabsTrigger value="latest-payments" className="shrink-0 px-3 py-1.5 text-sm">
                Latest Payments
              </TabsTrigger>
            </TabsList>
            <Input
                placeholder="Search by client..."
                value={searchInput}
                onChange={handleSearchChange}
                className="max-w-sm bg-background"
            />
          </div>
        )}
      >
        <TabsContent value="all" className="mt-0 min-w-0">
          <DataTable
              columns={columns}
              data={loans}
              isLoading={isLoading}
              variant="embedded"
              footer={(
                <Pagination
                    page={allLoansPage}
                    totalPages={allLoansTotalPages}
                    onPageChange={setAllLoansPage}
                    isLoading={isLoading}
                />
              )}
          />
        </TabsContent>
        <TabsContent value="review" className="mt-0 min-w-0">
          <DataTable
              columns={attentionColumns}
              data={attentionInstallments}
              isLoading={isAttentionLoading}
              variant="embedded"
              getRowClassName={(row) => getAttentionRowClassName(row.attentionCategory)}
              footer={(
                <Pagination
                    page={reviewPage}
                    totalPages={reviewTotalPages}
                    onPageChange={setReviewPage}
                    isLoading={isAttentionLoading}
                />
              )}
          />
        </TabsContent>
        <TabsContent value="latest-payments" className="mt-0 min-w-0">
          <DataTable
              columns={latestPaymentsColumns}
              data={latestPaidInstallments}
              isLoading={isLatestPaymentsLoading}
              variant="embedded"
              footer={(
                <Pagination
                    page={latestPaymentsPage}
                    totalPages={latestPaymentsTotalPages}
                    onPageChange={setLatestPaymentsPage}
                    isLoading={isLatestPaymentsLoading}
                />
              )}
          />
        </TabsContent>
      </AuthenticatedListPageShell>
    </Tabs>
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
