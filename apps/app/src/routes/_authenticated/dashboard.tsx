import { Link, createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BellRingIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  FileTextIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { useSession } from '@workspace/auth-client';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import {
  Badge,
  Button,
  LoadingState,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  cn,
} from '@workspace/ui';
import type { LucideIcon } from 'lucide-react';
import type {
  DashboardLoanAttentionItem,
  DashboardOverviewCard,
} from '@/app/hooks/use-dashboard';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { useDashboard } from '@/app/hooks/use-dashboard';
import { formatCurrency } from '@/app/lib/format';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [{ title: 'RTools - Dashboard' }] }),
  staticData: { title: 'Dashboard' },
  component: DashboardPage,
});

const OVERVIEW_CARD_STYLES: Record<string, {
  icon: LucideIcon;
  iconClassName: string;
  numberClassName: string;
}> = {
  clients: {
    icon: UsersIcon,
    iconClassName: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    numberClassName: 'text-emerald-700 dark:text-emerald-300',
  },
  loans: {
    icon: HandCoinsIcon,
    iconClassName: 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
    numberClassName: 'text-amber-700 dark:text-amber-300',
  },
};

function DashboardPage() {
  const { data: session } = useSession();
  const { authorization } = useAppAuthorization();
  const canViewDashboard = useCan(PermissionModule.DASHBOARD, PermissionAction.VIEW);
  const { data, isLoading, isError } = useDashboard(canViewDashboard);

  if (!canViewDashboard) {
    return (
      <UnauthorizedState
          title="Dashboard Access Required"
          description="Your account does not have permission to access the dashboard."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-muted/[0.18]">
        <LoadingState className="min-h-screen px-6 py-10" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="min-h-full bg-muted/[0.18] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col">
          <SectionCard>
            <SectionCardHeader className="justify-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangleIcon className="size-4.5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold">Unable to load dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  The latest dashboard data could not be loaded.
                </p>
              </div>
            </SectionCardHeader>
            <SectionCardContent className="flex items-center gap-3">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </SectionCardContent>
          </SectionCard>
        </div>
      </div>
    );
  }

  const summary = data.data;
  const userName = session?.user.name || session?.user.email || 'Operator';
  const roleBadges = authorization?.roles ?? [];
  const highlightedCards = summary.overviewCards.filter(
    (card) => card.id === 'clients' || card.id === 'loans',
  );
  const hasAnyOperationalContent =
    highlightedCards.length > 0
    || summary.quickLinks.length > 0
    || Boolean(summary.loanAttention)
    || Boolean(summary.accessSnapshot)
    || Boolean(summary.notificationSnapshot);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,rgba(246,246,243,0.88),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.36),rgba(2,6,23,0.76))]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-background/95 shadow-[0_30px_90px_-54px_rgba(0,0,0,0.22)]">
          <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(245,158,11,0.16),transparent_24%),linear-gradient(125deg,rgba(255,255,255,0.78),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(245,158,11,0.12),transparent_22%),linear-gradient(125deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]"
          />
          <div className="relative grid gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)] lg:px-7 lg:py-7">
            <div className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/12 text-primary shadow-sm shadow-primary/10">
                  <LayoutDashboardIcon className="size-5" />
                </span>
                <Badge variant="outline" className="rounded-full border-border/80 bg-background/75 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">
                  Workspace Overview
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDaysIcon className="size-4" />
                  <span>{format(new Date(), 'EEEE, MMM d')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground sm:text-[2.6rem]">
                  {userName}, here is the current state of your workspace.
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[0.96rem]">
                  This dashboard highlights borrower volume, loan activity, payment exceptions,
                  and access controls. All data shown here is scoped to the modules available to
                  your current role.
                </p>
              </div>

              {highlightedCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {highlightedCards.map((card) => (
                    <PortfolioPulseCard key={card.id} card={card} />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <AccessSummary roles={roleBadges} />
              <PriorityPanel attention={summary.loanAttention} links={summary.quickLinks.length} />
            </div>
          </div>
        </section>

        {hasAnyOperationalContent ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
            <div className="min-w-0">
              <AttentionSection attention={summary.loanAttention} />
            </div>
            <div className="min-w-0">
              <AdministrativeOverviewPanel
                  accessSnapshot={summary.accessSnapshot}
                  notificationSnapshot={summary.notificationSnapshot}
              />
            </div>
          </section>
        ) : (
          <EmptyWorkspaceState />
        )}
      </div>
    </div>
  );
}

function PortfolioPulseCard({ card }: { card: DashboardOverviewCard }) {
  const appearance = OVERVIEW_CARD_STYLES[card.id] ?? {
    icon: LayoutDashboardIcon,
    iconClassName: 'bg-primary/12 text-primary',
    numberClassName: 'text-foreground',
  };
  const Icon = appearance.icon;

  return (
    <Link
        to={card.href as never}
        className="group relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-background/90 p-4 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex size-11 items-center justify-center rounded-2xl', appearance.iconClassName)}>
          <Icon className="size-4.5" />
        </span>
        <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {card.title}
          </p>
          <p className={cn('mt-2 text-4xl font-semibold tracking-tight', appearance.numberClassName)}>
            {card.value}
          </p>
        </div>
      </div>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        {card.description}
      </p>
    </Link>
  );
}

function AccessSummary({
  roles,
}: {
  roles: Array<{ slug: string; name: string }>;
}) {
  return (
    <SectionCard className="border-border/70 bg-background/80">
      <SectionCardHeader className="justify-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
          <ShieldCheckIcon className="size-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Access Summary</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard visibility and available modules are based on these assigned roles.
          </p>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="flex flex-wrap gap-2">
        {roles.length > 0 ? roles.map((role) => (
          <Badge key={role.slug} variant="secondary" className="rounded-full px-3 py-1">
            {role.name}
          </Badge>
        )) : (
          <Badge variant="outline" className="rounded-full px-3 py-1">
            No assigned roles
          </Badge>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}

function PriorityPanel({
  attention,
  links,
}: {
  attention: {
    overdueCount: number;
    nearDueCount: number;
    total: number;
  } | undefined;
  links: number;
}) {
  return (
    <SectionCard className="overflow-hidden border-border/70 bg-background/80">
      <SectionCardContent className="relative space-y-4 px-4 py-4">
        <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),transparent)]"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Operational Summary
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Review exceptions and available actions.
            </h2>
          </div>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700 dark:text-amber-300">
            <AlertTriangleIcon className="size-4.5" />
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <PriorityMetric label="Open Exceptions" value={attention?.total ?? 0} />
          <PriorityMetric label="Overdue Items" value={attention?.overdueCount ?? 0} />
          <PriorityMetric label="Available Modules" value={links} />
        </div>
      </SectionCardContent>
    </SectionCard>
  );
}

function PriorityMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/75 bg-background/84 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function AttentionSection({
  attention,
}: {
  attention: {
    overdueCount: number;
    nearDueCount: number;
    total: number;
    items: Array<DashboardLoanAttentionItem>;
  } | undefined;
}) {
  if (!attention) {
    return null;
  }

  return (
    <SectionCard>
      <SectionCardHeader className="flex-col items-start gap-3 border-b-0 pb-0 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Payment Exceptions
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Items Requiring Review
          </h2>
          <p className="text-sm text-muted-foreground">
            Overdue and upcoming installments across the loans you can access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full border-0 bg-destructive/10 px-3 py-1 text-destructive">
            {attention.overdueCount} overdue
          </Badge>
          <Badge className="rounded-full border-0 bg-amber-500/12 px-3 py-1 text-amber-700 dark:text-amber-300">
            {attention.nearDueCount} near due
          </Badge>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="space-y-4 pt-4">
        <div className="grid gap-3 md:grid-cols-3">
          <SignalMetric
              label="Open Exceptions"
              value={attention.total}
              description="Installments currently flagged for follow-up."
          />
          <SignalMetric
              label="Overdue"
              value={attention.overdueCount}
              description="Installments already past due as of today."
          />
          <SignalMetric
              label="Shown Below"
              value={attention.items.length}
              description="Highest-priority records included in this view."
          />
        </div>

        {attention.items.length > 0 ? (
          <div className="space-y-3">
            {attention.items.map((item, index) => (
              <Link
                  key={item.id}
                  to={'/loans/$loanId'}
                  params={{ loanId: item.loanId }}
                  className="block rounded-[1.4rem] border border-border/80 bg-background/85 px-4 py-4 transition-colors hover:bg-muted/20"
              >
                <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-foreground/5 text-sm font-semibold text-foreground">
                      {index + 1}
                    </div>
                    <AttentionBadge category={item.attentionCategory} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {item.client.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Due on {format(new Date(item.dueDate), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[16rem]">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Remaining
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatCurrency(item.remainingAmount, item.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {item.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            No payment exceptions require review at the moment.
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}

function AdministrativeOverviewPanel({
  accessSnapshot,
  notificationSnapshot,
}: {
  accessSnapshot: {
    rolesCount?: number;
    usersCount?: number;
  } | undefined;
  notificationSnapshot: {
    recentFailedLogsCount: number;
    recentWindowDays: number;
    templatesCount: number;
  } | undefined;
}) {
  if (!accessSnapshot && !notificationSnapshot) {
    return (
      <SectionCard className="h-full">
        <SectionCardHeader className="flex-col items-start gap-2">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Administrative Overview
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Administration Status
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Administrative metrics are not available for this account.
            </p>
          </div>
        </SectionCardHeader>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="h-full">
      <SectionCardHeader className="flex-col items-start gap-2">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Administrative Overview
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Administration Status
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor user access and outbound delivery health from a single panel.
          </p>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="grid gap-3 sm:grid-cols-2">
        {typeof accessSnapshot?.usersCount === 'number' ? (
          <SignalMetric
              label="Users"
              value={accessSnapshot.usersCount}
              description="User accounts available in access management."
          />
        ) : null}
        {typeof accessSnapshot?.rolesCount === 'number' ? (
          <SignalMetric
              label="Roles"
              value={accessSnapshot.rolesCount}
              description="Role definitions available in the permission matrix."
          />
        ) : null}
        {notificationSnapshot ? (
          <>
            <SignalMetric
                label="Templates Configured"
                value={notificationSnapshot.templatesCount}
                description="Notification templates currently configured."
            />
            <SignalMetric
                label="Failed Deliveries"
                value={notificationSnapshot.recentFailedLogsCount}
                description={`Failed notification attempts recorded in the last ${notificationSnapshot.recentWindowDays} days.`}
            />
          </>
        ) : null}
      </SectionCardContent>
    </SectionCard>
  );
}

function EmptyWorkspaceState() {
  return (
    <SectionCard>
      <SectionCardHeader className="justify-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboardIcon className="size-4.5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">No operational data available</h2>
          <p className="text-sm text-muted-foreground">
            This account can access the dashboard, but no additional operational sections are currently available.
          </p>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Ask an administrator to assign the required module permissions if this dashboard should
          surface clients, loans, documents, notifications, roles, or users.
        </p>
        <Button asChild variant="outline">
          <Link to="/">
            Go to Home
          </Link>
        </Button>
      </SectionCardContent>
    </SectionCard>
  );
}

function SignalMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-border/75 bg-background/82 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function AttentionBadge({ category }: { category: 'overdue' | 'near_due' }) {
  return (
    <Badge
        className={cn(
        'rounded-full border-0 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]',
        category === 'overdue'
          ? 'bg-destructive/12 text-destructive'
          : 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
      )}
    >
      {category === 'overdue' ? 'Overdue' : 'Near Due'}
    </Badge>
  );
}
