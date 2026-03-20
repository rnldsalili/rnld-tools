import {
  NotificationChannel,
  NotificationLogStatus,
} from '@workspace/constants';
import {
  Badge,
  Button,
  Modal,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  cn,
} from '@workspace/ui';
import {
  CheckCheckIcon,
  Clock3Icon,
  Loader2Icon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  SendIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  WaypointsIcon,
} from 'lucide-react';
import type { NotificationLog } from '@/app/hooks/use-notifications';
import type { LucideIcon } from 'lucide-react';
import { useNotificationLog } from '@/app/hooks/use-notifications';
import {
  formatNotificationDate,
  getNotificationChannelLabel,
  getNotificationLogEventLabel,
  getNotificationLogStatusLabel,
  getNotificationProviderLabel,
} from '@/app/components/settings/notifications/utils';

interface NotificationLogDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationLogId: string;
}

type DeliveryStepState = 'complete' | 'current' | 'pending' | 'error';

export function NotificationLogDetailsModal({
  open,
  onOpenChange,
  notificationLogId,
}: NotificationLogDetailsModalProps) {
  const { data, isLoading } = useNotificationLog(notificationLogId);
  const notificationLog = data?.data.log ?? null;

  return (
    <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Notification Details"
        description="Inspect the delivery route, timeline, and captured payload details for this notification log."
        className="sm:max-w-5xl"
        footer={(
        <div className="flex w-full justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      )}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !notificationLog ? (
        <div className="py-8 text-sm text-muted-foreground">
          Notification log not found.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <NotificationOverview notificationLog={notificationLog} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
            <div className="flex flex-col gap-5">
              <NotificationRouteCard notificationLog={notificationLog} />
              <NotificationTimelineCard notificationLog={notificationLog} />
              {notificationLog.lastErrorMessage ? (
                <SectionCard className="bg-destructive/5 ring-destructive/15">
                  <SectionCardHeader className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <TriangleAlertIcon className="size-4" />
                      Last Error
                    </div>
                    <p className="text-sm text-destructive/80">
                      The latest provider response kept this notification from completing.
                    </p>
                  </SectionCardHeader>
                  <SectionCardContent>
                    <p className="text-sm leading-6 text-foreground">
                      {notificationLog.lastErrorMessage}
                    </p>
                  </SectionCardContent>
                </SectionCard>
              ) : null}
            </div>

            <div className="flex flex-col gap-5">
              {notificationLog.subject ? (
                <SectionCard>
                  <SectionCardHeader className="flex flex-col items-start gap-1.5">
                    <div className="text-sm font-semibold text-foreground">Subject</div>
                    <p className="text-sm text-muted-foreground">
                      The subject captured when this notification was queued.
                    </p>
                  </SectionCardHeader>
                  <SectionCardContent>
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground">
                      {notificationLog.subject}
                    </div>
                  </SectionCardContent>
                </SectionCard>
              ) : null}

              <NotificationMessageCard notificationLog={notificationLog} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NotificationOverview({ notificationLog }: { notificationLog: NotificationLog }) {
  const recipientDetails = getRecipientDetails(notificationLog);
  const statusVariant = getStatusBadgeVariant(notificationLog.status);
  const statusSummary = getStatusSummary(notificationLog);

  return (
    <section className="relative overflow-hidden rounded-[1.25rem] border border-border bg-gradient-to-br from-background via-muted/10 to-primary/5 p-5">
      <div className="pointer-events-none absolute -right-10 top-0 hidden size-48 rounded-full bg-primary/10 blur-3xl lg:block" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{getNotificationChannelLabel(notificationLog.channel)}</Badge>
          <Badge variant={statusVariant}>{getNotificationLogStatusLabel(notificationLog.status)}</Badge>
          <Badge variant={notificationLog.isTestSend ? 'secondary' : 'outline'}>
            {notificationLog.isTestSend ? 'Test send' : 'Live delivery'}
          </Badge>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:items-start">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Delivery target
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {recipientDetails.primary}
              </h2>
              {recipientDetails.secondary ? (
                <p className="text-sm text-muted-foreground">
                  {recipientDetails.secondary}
                </p>
              ) : null}
            </div>

            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {statusSummary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <OverviewStat
                label="Event"
                value={getNotificationLogEventLabel(notificationLog.event)}
            />
            <OverviewStat
                label="Provider"
                value={getNotificationProviderLabel(notificationLog)}
            />
            <OverviewStat
                label="Attempts"
                value={String(notificationLog.attemptCount)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function NotificationRouteCard({ notificationLog }: { notificationLog: NotificationLog }) {
  const recipientDetails = getRecipientDetails(notificationLog);

  return (
    <SectionCard>
      <SectionCardHeader className="flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <WaypointsIcon className="size-4 text-muted-foreground" />
          Delivery Route
        </div>
        <p className="text-sm text-muted-foreground">
          Who queued it, how it was routed, and where it was sent.
        </p>
      </SectionCardHeader>
      <SectionCardContent className="grid gap-3 md:grid-cols-2">
        <DetailPanel
            label="Recipient"
            value={recipientDetails.primary}
            description={recipientDetails.secondary}
            icon={MessageSquareTextIcon}
        />
        <DetailPanel
            label="Provider"
            value={getNotificationProviderLabel(notificationLog)}
            icon={SendIcon}
        />
        <DetailPanel
            label="Queued By"
            value={notificationLog.queuedByUser?.name ?? 'System'}
            description={notificationLog.queuedByUser?.email ?? 'No user information captured'}
            icon={UserRoundIcon}
            className="md:col-span-2"
        />
      </SectionCardContent>
    </SectionCard>
  );
}

function NotificationTimelineCard({ notificationLog }: { notificationLog: NotificationLog }) {
  const timelineSteps = getTimelineSteps(notificationLog);

  return (
    <SectionCard>
      <SectionCardHeader className="flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock3Icon className="size-4 text-muted-foreground" />
          Delivery Timeline
        </div>
        <p className="text-sm text-muted-foreground">
          Progression from queue creation to final delivery outcome.
        </p>
      </SectionCardHeader>
      <SectionCardContent>
        <ol className="flex flex-col gap-4">
          {timelineSteps.map((step, index) => (
            <TimelineStep
                key={step.label}
                label={step.label}
                description={step.description}
                timestamp={step.timestamp}
                icon={step.icon}
                state={step.state}
                isLast={index === timelineSteps.length - 1}
            />
          ))}
        </ol>
      </SectionCardContent>
    </SectionCard>
  );
}

function NotificationMessageCard({ notificationLog }: { notificationLog: NotificationLog }) {
  const isEmail = notificationLog.channel === NotificationChannel.EMAIL;

  return (
    <SectionCard>
      <SectionCardHeader className="flex flex-col items-start gap-1.5">
        <div className="text-sm font-semibold text-foreground">
          {isEmail ? 'Rendered Email' : 'Saved Message'}
        </div>
        <p className="text-sm text-muted-foreground">
          {isEmail
            ? 'Stored content snapshot for the email that was sent.'
            : 'Stored SMS body exactly as it was queued.'}
        </p>
      </SectionCardHeader>
      <SectionCardContent className="overflow-hidden px-0 py-0">
        {isEmail ? (
          <div className="bg-background">
            <div className="flex items-center justify-between border-b border-border/80 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span>Email preview</span>
              <span>{formatNotificationDate(notificationLog.sentAt ?? notificationLog.queuedAt)}</span>
            </div>
            <div className="bg-white">
              <iframe
                  title="Notification email preview"
                  srcDoc={notificationLog.messageContent}
                  className="h-[32rem] w-full bg-white"
                  sandbox=""
              />
            </div>
          </div>
        ) : (
          <div className="bg-background">
            <div className="flex items-center justify-between border-b border-border/80 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span>SMS preview</span>
              <span>{formatNotificationDate(notificationLog.sentAt ?? notificationLog.queuedAt)}</span>
            </div>
            <div className="max-h-[32rem] overflow-auto px-4 py-4">
              <pre className="font-sans text-sm leading-6 whitespace-pre-wrap break-words text-foreground">
                {notificationLog.messageContent}
              </pre>
            </div>
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 backdrop-blur-sm">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function DetailPanel({
  label,
  value,
  description,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
        className={cn(
        'rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm shadow-black/[0.02]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>
          {description ? (
            <p className="text-sm text-muted-foreground break-words">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  label,
  description,
  timestamp,
  icon: Icon,
  state,
  isLast,
}: {
  label: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
  state: DeliveryStepState;
  isLast: boolean;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-3">
      <div className="flex flex-col items-center">
        <div
            className={cn(
            'flex size-10 items-center justify-center rounded-full border',
            getTimelineStepClasses(state),
          )}
        >
          <Icon className="size-4" />
        </div>
        {!isLast ? (
          <div
              className={cn(
              'mt-2 h-full w-px min-h-8',
              state === 'error' ? 'bg-destructive/30' : 'bg-border',
            )}
          />
        ) : null}
      </div>

      <div className="rounded-xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm shadow-black/[0.02]">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <Badge variant={getTimelineBadgeVariant(state)} className="shrink-0">
            {timestamp}
          </Badge>
        </div>
      </div>
    </li>
  );
}

function getRecipientDetails(notificationLog: NotificationLog) {
  if (notificationLog.channel === NotificationChannel.EMAIL) {
    return {
      primary: notificationLog.recipientName ?? notificationLog.recipientEmail ?? '-',
      secondary: notificationLog.recipientName ? notificationLog.recipientEmail ?? undefined : undefined,
    };
  }

  return {
    primary: notificationLog.recipientPhone ?? '-',
    secondary: undefined,
  };
}

function getStatusBadgeVariant(status: NotificationLogStatus) {
  if (status === NotificationLogStatus.SENT) {
    return 'default';
  }

  if (status === NotificationLogStatus.FAILED) {
    return 'destructive';
  }

  if (status === NotificationLogStatus.QUEUED) {
    return 'secondary';
  }

  return 'outline';
}

function getStatusSummary(notificationLog: NotificationLog) {
  const providerLabel = getNotificationProviderLabel(notificationLog);
  const eventLabel = getNotificationLogEventLabel(notificationLog.event);
  const attemptLabel = `${notificationLog.attemptCount} attempt${notificationLog.attemptCount === 1 ? '' : 's'}`;

  if (notificationLog.status === NotificationLogStatus.SENT) {
    return `${notificationLog.isTestSend ? 'Test send' : eventLabel} was delivered through ${providerLabel} after ${attemptLabel}.`;
  }

  if (notificationLog.status === NotificationLogStatus.FAILED) {
    return `${notificationLog.isTestSend ? 'Test send' : eventLabel} failed after ${attemptLabel} through ${providerLabel}.`;
  }

  if (notificationLog.status === NotificationLogStatus.RETRYING) {
    return `${notificationLog.isTestSend ? 'Test send' : eventLabel} is retrying after the latest provider response from ${providerLabel}.`;
  }

  if (notificationLog.status === NotificationLogStatus.PROCESSING) {
    return `${notificationLog.isTestSend ? 'Test send' : eventLabel} is currently being processed by ${providerLabel}.`;
  }

  return `${notificationLog.isTestSend ? 'Test send' : eventLabel} is queued and waiting to be picked up by ${providerLabel}.`;
}

function getTimelineSteps(notificationLog: NotificationLog): Array<{
  label: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
  state: DeliveryStepState;
}> {
  const providerLabel = getNotificationProviderLabel(notificationLog);
  const queuedByLabel = notificationLog.queuedByUser?.name ?? 'System';
  const attemptsLabel = `${notificationLog.attemptCount} attempt${notificationLog.attemptCount === 1 ? '' : 's'}`;

  return [
    {
      label: 'Queued',
      description: `Added to the delivery queue by ${queuedByLabel}.`,
      timestamp: formatNotificationDate(notificationLog.queuedAt),
      icon: Clock3Icon,
      state: 'complete' as const,
    },
    {
      label: notificationLog.attemptCount > 1 ? 'Retry Activity' : 'Provider Attempt',
      description: notificationLog.lastAttemptAt
        ? `${attemptsLabel} recorded through ${providerLabel}.`
        : `Waiting for ${providerLabel} to start the first delivery attempt.`,
      timestamp: formatNotificationDate(notificationLog.lastAttemptAt),
      icon: notificationLog.status === NotificationLogStatus.RETRYING
        ? RefreshCwIcon
        : SendIcon,
      state: notificationLog.lastAttemptAt
        ? 'complete'
        : notificationLog.status === NotificationLogStatus.QUEUED
          ? 'current'
          : 'pending',
    },
    {
      label: notificationLog.status === NotificationLogStatus.FAILED ? 'Failed' : 'Outcome',
      description: getOutcomeDescription(notificationLog),
      timestamp: formatNotificationDate(notificationLog.failedAt ?? notificationLog.sentAt),
      icon: notificationLog.status === NotificationLogStatus.FAILED
        ? TriangleAlertIcon
        : CheckCheckIcon,
      state: getOutcomeState(notificationLog),
    },
  ];
}

function getOutcomeDescription(notificationLog: NotificationLog) {
  if (notificationLog.status === NotificationLogStatus.SENT) {
    return 'Delivery completed successfully and the notification was marked as sent.';
  }

  if (notificationLog.status === NotificationLogStatus.FAILED) {
    return 'Delivery stopped after the latest error and no further success signal was received.';
  }

  if (notificationLog.status === NotificationLogStatus.RETRYING) {
    return 'The system is waiting for the next retry window after the last failed attempt.';
  }

  if (notificationLog.status === NotificationLogStatus.PROCESSING) {
    return 'The provider has accepted the work and final delivery confirmation is still pending.';
  }

  return 'The notification is still in queue and has not reached a final delivery outcome yet.';
}

function getOutcomeState(notificationLog: NotificationLog): DeliveryStepState {
  if (notificationLog.status === NotificationLogStatus.SENT) {
    return 'complete';
  }

  if (notificationLog.status === NotificationLogStatus.FAILED) {
    return 'error';
  }

  if (notificationLog.status === NotificationLogStatus.RETRYING
    || notificationLog.status === NotificationLogStatus.PROCESSING) {
    return 'current';
  }

  return 'pending';
}

function getTimelineStepClasses(state: DeliveryStepState) {
  if (state === 'complete') {
    return 'border-primary/20 bg-primary/10 text-primary';
  }

  if (state === 'current') {
    return 'border-border bg-muted text-foreground';
  }

  if (state === 'error') {
    return 'border-destructive/20 bg-destructive/10 text-destructive';
  }

  return 'border-border bg-background text-muted-foreground';
}

function getTimelineBadgeVariant(state: DeliveryStepState) {
  if (state === 'complete') {
    return 'secondary';
  }

  if (state === 'error') {
    return 'destructive';
  }

  return 'outline';
}
