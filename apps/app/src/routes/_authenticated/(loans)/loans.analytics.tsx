import { format, parseISO, startOfYear, subDays } from 'date-fns';
import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  HandCoinsIcon,
  Loader2Icon,
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
import { z } from 'zod';
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
  Input,
  LoadingState,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  cn,
} from '@workspace/ui';
import type { ChartConfig } from '@workspace/ui';
import type {
  LoanAnalyticsAgingBucket,
  LoanAnalyticsEarningsRange,
  LoanAnalyticsEarningsSummary,
  LoanAnalyticsEarningsTrendItem,
  LoanAnalyticsSummary,
} from '@/app/hooks/use-loan-analytics';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useLoanAnalytics } from '@/app/hooks/use-loan-analytics';
import { formatCurrency } from '@/app/lib/format';

const EARNINGS_RANGE_PRESETS = ['last-30-days', 'last-90-days', 'this-year'] as const;
const DEFAULT_EARNINGS_RANGE_DAYS = 90;

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

const earningsVsCollectionsChartConfig = {
  projectedEarnings: {
    label: 'Projected Earnings',
    color: 'var(--color-chart-5)',
  },
  collectedAmount: {
    label: 'Collected',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

const earningsReceivablesChartConfig = {
  projectedReceivables: {
    label: 'Projected Receivables',
    color: 'var(--color-chart-2)',
  },
  outstandingReceivables: {
    label: 'Outstanding Receivables',
    color: 'var(--color-chart-4)',
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
  outstandingReceivables: 'Outstanding Receivables',
  projectedEarnings: 'Projected Earnings',
  projectedReceivables: 'Projected Receivables',
};

const loanAnalyticsSearchSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(
  ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
  {
    message: 'startDate must be before or equal to endDate',
    path: ['endDate'],
  },
);

type EarningsPreset = typeof EARNINGS_RANGE_PRESETS[number];

type EarningsDateRange = {
  startDate: string;
  endDate: string;
};

const earningsPresetLabels: Record<EarningsPreset, string> = {
  'last-30-days': 'Last 30 days',
  'last-90-days': 'Last 90 days',
  'this-year': 'This year',
};

export const Route = createFileRoute('/_authenticated/(loans)/loans/analytics')({
  head: () => ({ meta: [{ title: 'RTools - Loan Analytics' }] }),
  staticData: { title: 'Loan Analytics' },
  validateSearch: loanAnalyticsSearchSchema,
  component: LoanAnalyticsPage,
});

function LoanAnalyticsPage() {
  const router = useRouter();
  const canViewLoans = useCan(PermissionModule.LOANS, PermissionAction.VIEW);
  const search = Route.useSearch();
  const selectedEarningsRange = resolveEarningsDateRange(search);
  const { data, isLoading, isError, isFetching } = useLoanAnalytics({
    enabled: canViewLoans,
    startDate: selectedEarningsRange.startDate,
    endDate: selectedEarningsRange.endDate,
  });
  const analyticsData = data?.data;
  const showInitialLoadingState = isLoading && !analyticsData;
  const showInitialErrorState = isError && !analyticsData;

  function updateEarningsRange(nextRange: {
    startDate?: string;
    endDate?: string;
  }) {
    void router.navigate({
      to: Route.to,
      search: (previousSearch) => ({
        ...previousSearch,
        ...nextRange,
      }),
      replace: true,
    });
  }

  function handlePresetChange(preset: EarningsPreset) {
    updateEarningsRange(getPresetDateRange(preset));
  }

  function handleStartDateChange(nextStartDate: string) {
    const normalizedStartDate = nextStartDate || undefined;
    let normalizedEndDate = search.endDate ?? selectedEarningsRange.endDate;

    if (normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
      normalizedEndDate = normalizedStartDate;
    }

    updateEarningsRange({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    });
  }

  function handleEndDateChange(nextEndDate: string) {
    const normalizedEndDate = nextEndDate || undefined;
    let normalizedStartDate = search.startDate ?? selectedEarningsRange.startDate;

    if (normalizedEndDate && normalizedStartDate && normalizedEndDate < normalizedStartDate) {
      normalizedStartDate = normalizedEndDate;
    }

    updateEarningsRange({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    });
  }

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
      {showInitialLoadingState ? (
        <LoadingState className="min-h-[60vh] px-4 py-6 sm:px-5" />
      ) : showInitialErrorState || !analyticsData ? (
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
            currency={analyticsData.currency}
            summary={analyticsData.summary}
            monthlyTrend={analyticsData.monthlyTrend}
            agingBuckets={analyticsData.agingBuckets}
            upcomingDue={analyticsData.upcomingDue}
            earningsRange={analyticsData.earnings.range}
            earningsSummary={analyticsData.earnings.summary}
            earningsTrend={analyticsData.earnings.trend}
            selectedEarningsRange={selectedEarningsRange}
            isEarningsRefreshing={isFetching}
            onPresetChange={handlePresetChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
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
  earningsRange,
  earningsSummary,
  earningsTrend,
  selectedEarningsRange,
  isEarningsRefreshing,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
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
  earningsRange: LoanAnalyticsEarningsRange;
  earningsSummary: LoanAnalyticsEarningsSummary;
  earningsTrend: Array<LoanAnalyticsEarningsTrendItem>;
  selectedEarningsRange: EarningsDateRange;
  isEarningsRefreshing: boolean;
  onPresetChange: (preset: EarningsPreset) => void;
  onStartDateChange: (nextDate: string) => void;
  onEndDateChange: (nextDate: string) => void;
}) {
  const hasNoPhpLoans = summary.totalLoans === 0;
  const activePreset = getActivePreset(selectedEarningsRange);

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
            description="Money collected toward balances, including older paid loans without payment records."
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
                from due-date, earnings, and aging charts until schedules are created.
              </p>
            </div>
          </SectionCardHeader>
        </SectionCard>
      ) : null}

      <SectionCard className="overflow-hidden border-border/80 bg-[linear-gradient(180deg,rgba(12,74,110,0.04),transparent_28%),var(--background)]">
        <SectionCardHeader className="flex-col items-start gap-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight">Earnings</h2>
              <p className="text-sm text-muted-foreground">
                Date range applies only to the earnings section below. Earnings are projected from scheduled receivables minus allocated principal.
              </p>
            </div>
            <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity',
                  isEarningsRefreshing
                    ? 'border-primary/20 bg-primary/5 text-primary opacity-100'
                    : 'border-border/70 bg-background/80 text-muted-foreground opacity-0 sm:opacity-100',
                )}
                aria-live="polite"
            >
              {isEarningsRefreshing ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Updating earnings
                </>
              ) : (
                'Earnings up to date'
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 rounded-xl border border-border/70 bg-background/90 p-3">
            <div className="flex flex-wrap gap-2">
              {EARNINGS_RANGE_PRESETS.map((preset) => (
                <Button
                    key={preset}
                    type="button"
                    variant={activePreset === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPresetChange(preset)}
                >
                  {earningsPresetLabels[preset]}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <DateInputField
                  label="From"
                  value={selectedEarningsRange.startDate}
                  onChange={onStartDateChange}
              />
              <DateInputField
                  label="To"
                  value={selectedEarningsRange.endDate}
                  onChange={onEndDateChange}
              />
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/[0.28] px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Current range
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatDateRangeLabel(earningsRange)}
                </p>
              </div>
            </div>
          </div>
        </SectionCardHeader>

        <SectionCardContent className="grid gap-4">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
                title="Projected Receivables"
                value={formatCurrency(earningsSummary.projectedReceivablesInRange, currency)}
                description="Scheduled amounts expected within the selected date range."
                icon={HandCoinsIcon}
            />
            <MetricCard
                title="Projected Earnings"
                value={formatCurrency(earningsSummary.projectedEarningsInRange, currency)}
                description="Projected receivables minus allocated principal in the selected range."
                icon={CircleDollarSignIcon}
            />
            <MetricCard
                title="Collected in Range"
                value={formatCurrency(earningsSummary.collectedInRange, currency)}
                description="Payments recorded in the selected range, including legacy fallback entries."
                icon={CircleDollarSignIcon}
            />
            <MetricCard
                title="Outstanding Receivables"
                value={formatCurrency(earningsSummary.outstandingReceivablesInRange, currency)}
                description="Unpaid scheduled balance whose due dates fall inside the selected range."
                icon={WalletCardsIcon}
            />
            <MetricCard
                title="Outstanding Projected Earnings"
                value={formatCurrency(earningsSummary.outstandingProjectedEarningsInRange, currency)}
                description="Projected earnings still tied to unpaid installments in the selected range."
                icon={ShieldAlertIcon}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ChartCard
                title="Projected Earnings vs Collected"
                description="Shows projected earnings by due month next to the money collected in the same reporting range."
            >
              <ChartContainer config={earningsVsCollectionsChartConfig} className="min-h-[280px] w-full">
                <BarChart accessibilityLayer data={earningsTrend} barGap={10}>
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
                      dataKey="projectedEarnings"
                      fill="var(--color-projectedEarnings)"
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
                title="Projected Receivables vs Outstanding"
                description="Compares what was scheduled in the range with the balance that still remains unpaid."
            >
              <ChartContainer config={earningsReceivablesChartConfig} className="min-h-[280px] w-full">
                <AreaChart accessibilityLayer data={earningsTrend}>
                  <defs>
                    <linearGradient id="earnings-projected-receivables" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-projectedReceivables)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--color-projectedReceivables)" stopOpacity={0.06} />
                    </linearGradient>
                    <linearGradient id="earnings-outstanding-receivables" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-outstandingReceivables)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--color-outstandingReceivables)" stopOpacity={0.04} />
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
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                      type="monotone"
                      dataKey="projectedReceivables"
                      stroke="var(--color-projectedReceivables)"
                      fill="url(#earnings-projected-receivables)"
                      strokeWidth={2}
                  />
                  <Area
                      type="monotone"
                      dataKey="outstandingReceivables"
                      stroke="var(--color-outstandingReceivables)"
                      fill="url(#earnings-outstanding-receivables)"
                      strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </ChartCard>
          </section>
        </SectionCardContent>
      </SectionCard>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <ChartCard
            title="Monthly Originations vs Collections"
            description="Compares loans created and money collected over the last 12 months, using paid loan dates when payment records are missing."
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

function DateInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn('bg-background')}
      />
    </label>
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

function getPresetDateRange(preset: EarningsPreset): EarningsDateRange {
  const today = new Date();

  switch (preset) {
    case 'last-30-days':
      return {
        startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      };
    case 'this-year':
      return {
        startDate: format(startOfYear(today), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      };
    case 'last-90-days':
    default:
      return {
        startDate: format(subDays(today, DEFAULT_EARNINGS_RANGE_DAYS - 1), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      };
  }
}

function resolveEarningsDateRange(search: {
  startDate?: string;
  endDate?: string;
}): EarningsDateRange {
  const fallbackEndDate = format(new Date(), 'yyyy-MM-dd');
  const resolvedEndDate = search.endDate ?? fallbackEndDate;
  const resolvedStartDate = search.startDate ?? format(
    subDays(parseISO(resolvedEndDate), DEFAULT_EARNINGS_RANGE_DAYS - 1),
    'yyyy-MM-dd',
  );

  return {
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
  };
}

function getActivePreset(selectedRange: EarningsDateRange) {
  return EARNINGS_RANGE_PRESETS.find((preset) => {
    const presetRange = getPresetDateRange(preset);

    return presetRange.startDate === selectedRange.startDate
      && presetRange.endDate === selectedRange.endDate;
  });
}

function formatDateRangeLabel(range: LoanAnalyticsEarningsRange) {
  return `${format(parseISO(range.startDate), 'MMM d, yyyy')} - ${format(parseISO(range.endDate), 'MMM d, yyyy')}`;
}
