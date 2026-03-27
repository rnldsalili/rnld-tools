import { Link, createFileRoute } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  HandCoinsIcon,
  ShieldAlertIcon,
  WalletCardsIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  LoadingState,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import type { ChartConfig } from '@workspace/ui';
import type {
  LoanAnalyticsAgingBucket,
  LoanAnalyticsSummary,
} from '@/app/hooks/use-loan-analytics';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useLoanAnalytics } from '@/app/hooks/use-loan-analytics';
import { formatCurrency } from '@/app/lib/format';

const monthlyTrendChartConfig = {
  originatedAmount: {
    label: 'Originated',
    color: 'var(--color-chart-2)',
  },
  collectedAmount: {
    label: 'Collected',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

const agingChartConfig = {
  outstandingAmount: {
    label: 'Outstanding',
    color: 'var(--color-chart-4)',
  },
} satisfies ChartConfig;

const upcomingDueChartConfig = {
  dueAmount: {
    label: 'Due Amount',
    color: 'var(--color-chart-3)',
  },
} satisfies ChartConfig;

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

const chartTooltipLabels: Record<string, string> = {
  collectedAmount: 'Collected',
  dueAmount: 'Due Amount',
  originatedAmount: 'Originated',
  outstandingAmount: 'Outstanding',
};

export const Route = createFileRoute('/_authenticated/(loans)/loans/analytics')({
  head: () => ({ meta: [{ title: 'RTools - Loan Analytics' }] }),
  staticData: { title: 'Loan Analytics' },
  component: LoanAnalyticsPage,
});

function LoanAnalyticsPage() {
  const canViewLoans = useCan(PermissionModule.LOANS, PermissionAction.VIEW);
  const { data, isLoading, isError } = useLoanAnalytics(canViewLoans);

  if (!canViewLoans) {
    return (
      <UnauthorizedState
          title="Loan Analytics Restricted"
          description="You do not have permission to view loan analytics."
      />
    );
  }

  return (
    <AuthenticatedListPageShell
        icon={BarChart3Icon}
        title="Loan Analytics"
        description="Monitor portfolio cash flow, outstanding exposure, and near-term due amounts across the loans you can access."
        action={(
        <Button asChild variant="outline">
          <Link to="/loans">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Loans
          </Link>
        </Button>
      )}
    >
      {isLoading ? (
        <LoadingState className="min-h-[60vh] px-4 py-6 sm:px-5" />
      ) : isError || !data?.data ? (
        <div className="p-4 sm:p-5">
          <SectionCard>
            <SectionCardHeader className="justify-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangleIcon className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Unable to load analytics</h2>
                <p className="text-sm text-muted-foreground">
                  The latest loan portfolio analytics could not be loaded.
                </p>
              </div>
            </SectionCardHeader>
            <SectionCardContent>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </SectionCardContent>
          </SectionCard>
        </div>
      ) : (
        <LoanAnalyticsContent
            currency={data.data.currency}
            summary={data.data.summary}
            monthlyTrend={data.data.monthlyTrend}
            agingBuckets={data.data.agingBuckets}
            upcomingDue={data.data.upcomingDue}
        />
      )}
    </AuthenticatedListPageShell>
  );
}

function LoanAnalyticsContent({
  currency,
  summary,
  monthlyTrend,
  agingBuckets,
  upcomingDue,
}: {
  currency: string;
  summary: LoanAnalyticsSummary;
  monthlyTrend: Array<{
    monthKey: string;
    label: string;
    originatedAmount: number;
    collectedAmount: number;
  }>;
  agingBuckets: Array<LoanAnalyticsAgingBucket>;
  upcomingDue: Array<{
    monthKey: string;
    label: string;
    dueAmount: number;
    installmentsCount: number;
  }>;
}) {
  const hasNoPhpLoans = summary.totalLoans === 0;

  return (
    <div className="grid gap-4 p-4 sm:p-5">
      {hasNoPhpLoans ? (
        <SectionCard>
          <SectionCardHeader className="justify-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <HandCoinsIcon className="size-4.5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">No PHP loans available</h2>
              <p className="text-sm text-muted-foreground">
                Summary cards remain available, but there is no PHP loan data to chart yet.
              </p>
            </div>
          </SectionCardHeader>
        </SectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
            title="Total Principal Loaned"
            value={formatCurrency(summary.totalPrincipalLoaned, currency)}
            description={`${summary.totalLoans} PHP loan${summary.totalLoans === 1 ? '' : 's'} in scope`}
            icon={HandCoinsIcon}
        />
        <MetricCard
            title="Applied Collections"
            value={formatCurrency(summary.totalAppliedCollections, currency)}
            description="Money collected and applied to loan balances."
            icon={CircleDollarSignIcon}
        />
        <MetricCard
            title="Scheduled Outstanding"
            value={formatCurrency(summary.scheduledOutstanding, currency)}
            description="Unpaid balance from all scheduled installments."
            icon={WalletCardsIcon}
        />
        <MetricCard
            title="Overdue Outstanding"
            value={formatCurrency(summary.overdueOutstanding, currency)}
            description="Unpaid balance that is already overdue."
            icon={ShieldAlertIcon}
        />
        <MetricCard
            title="Active Excess Balance"
            value={formatCurrency(summary.activeExcessBalance, currency)}
            description="Extra payments that have not been applied yet."
            icon={CircleDollarSignIcon}
        />
        <MetricCard
            title="Loans Requiring Review"
            value={summary.loansRequiringReview.toLocaleString()}
            description="Loans with payments that need attention soon."
            icon={CalendarClockIcon}
        />
      </section>

      {summary.unscheduledLoansCount > 0 ? (
        <SectionCard className="border-amber-300/70 bg-amber-50/50 dark:bg-amber-950/10">
          <SectionCardHeader className="justify-start gap-3 border-amber-300/60 bg-transparent">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 dark:text-amber-300">
              <AlertTriangleIcon className="size-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Unscheduled loan balance detected</h2>
              <p className="text-sm text-muted-foreground">
                {summary.unscheduledLoansCount} PHP loan{summary.unscheduledLoansCount === 1 ? '' : 's'} have no installments,
                representing {formatCurrency(summary.unscheduledLoanAmount, currency)} in principal. These loans are excluded
                from due-date and aging charts until schedules are created.
              </p>
            </div>
          </SectionCardHeader>
        </SectionCard>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <ChartCard
            title="Monthly Originations vs Collections"
            description="Compares loans created and money collected over the last 12 months."
        >
          <ChartContainer config={monthlyTrendChartConfig} className="min-h-[280px] w-full">
            <BarChart accessibilityLayer data={monthlyTrend} barGap={10}>
              <CartesianGrid vertical={false} />
              <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  minTickGap={18}
              />
              <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompactAxisValue}
                  width={52}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={createCurrencyTooltipFormatter(currency)} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                  dataKey="originatedAmount"
                  fill="var(--color-originatedAmount)"
                  radius={[6, 6, 0, 0]}
              />
              <Bar
                  dataKey="collectedAmount"
                  fill="var(--color-collectedAmount)"
                  radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
            title="Outstanding Aging"
            description="Shows how much unpaid balance is still current or already overdue."
        >
          <ChartContainer config={agingChartConfig} className="min-h-[280px] w-full">
            <BarChart accessibilityLayer data={agingBuckets}>
              <CartesianGrid vertical={false} />
              <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
              />
              <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompactAxisValue}
                  width={52}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={createCurrencyTooltipFormatter(currency)} />} />
              <Bar
                  dataKey="outstandingAmount"
                  fill="var(--color-outstandingAmount)"
                  radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </section>

      <ChartCard
          title="Upcoming Due Schedule"
          description="Shows how much unpaid balance is due over the next 6 months."
      >
        <ChartContainer config={upcomingDueChartConfig} className="min-h-[320px] w-full">
          <AreaChart accessibilityLayer data={upcomingDue}>
            <defs>
              <linearGradient id="loan-upcoming-due" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-dueAmount)" stopOpacity={0.34} />
                <stop offset="95%" stopColor="var(--color-dueAmount)" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
            />
            <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompactAxisValue}
                width={52}
            />
            <ChartTooltip content={<ChartTooltipContent formatter={createCurrencyTooltipFormatter(currency)} />} />
            <Area
                type="monotone"
                dataKey="dueAmount"
                stroke="var(--color-dueAmount)"
                fill="url(#loan-upcoming-due)"
                strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </ChartCard>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border border-border/80 bg-background/90" size="sm">
      <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tracking-tight">{value}</CardTitle>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4.5" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard>
      <SectionCardHeader className="flex-col items-start gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </SectionCardHeader>
      <SectionCardContent className="pt-4">
        {children}
      </SectionCardContent>
    </SectionCard>
  );
}

function formatCompactAxisValue(value: number | string) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return compactNumberFormatter.format(numericValue);
}

function createCurrencyTooltipFormatter(currency: string) {
  function CurrencyTooltipFormatter(
    value: number | string | ReadonlyArray<number | string> | undefined,
    name: number | string | undefined,
    _item?: unknown,
    _index?: number,
    _payload?: unknown,
  ) {
    const numericValue = Array.isArray(value)
      ? Number(value[0])
      : typeof value === 'number'
        ? value
        : Number(value);
    const resolvedName = name == null ? '' : String(name);

    return (
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className="text-muted-foreground">
          {chartTooltipLabels[resolvedName] ?? resolvedName}
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {formatCurrency(Number.isFinite(numericValue) ? numericValue : 0, currency)}
        </span>
      </div>
    );
  }

  CurrencyTooltipFormatter.displayName = 'CurrencyTooltipFormatter';

  return CurrencyTooltipFormatter;
}
