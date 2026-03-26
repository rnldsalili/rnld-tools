import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_LOGS_LIMIT,
  NOTIFICATION_LOG_STATUSES,
  NOTIFICATION_LOG_STATUS_LABELS,
  NotificationChannel,
  NotificationLogStatus,
} from '@workspace/constants';
import { EyeIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  NotificationEvent,
  NotificationLogStatus as NotificationLogStatusType,
} from '@workspace/constants';
import type { NotificationLogListItem } from '@/app/hooks/use-notifications';
import { NotificationLogDetailsModal } from '@/app/components/settings/notification-log-details-modal';
import {
  formatNotificationDate,
  getNotificationChannelLabel,
  getNotificationLogEventLabel,
  getNotificationLogRecipient,
  getNotificationLogStatusLabel,
  getNotificationProviderLabel,
  isNotificationChannel,
  isNotificationEvent,
  isNotificationLogStatus,
} from '@/app/components/settings/notifications/utils';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useNotificationLogs } from '@/app/hooks/use-notifications';

const ALL_FILTER_VALUE = 'ALL';

type NotificationLogChannelFilter = NotificationChannel | typeof ALL_FILTER_VALUE;
type NotificationLogEventFilter = NotificationEvent | typeof ALL_FILTER_VALUE;
type NotificationLogStatusFilter = NotificationLogStatusType | typeof ALL_FILTER_VALUE;
type NotificationLogTestFilter = 'ALL' | 'TEST' | 'LIVE';

function isNotificationLogTestFilter(value: unknown): value is NotificationLogTestFilter {
  return value === 'ALL' || value === 'TEST' || value === 'LIVE';
}

export function NotificationHistorySection() {
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyChannelFilter, setHistoryChannelFilter] = useState<NotificationLogChannelFilter>(ALL_FILTER_VALUE);
  const [historyEventFilter, setHistoryEventFilter] = useState<NotificationLogEventFilter>(ALL_FILTER_VALUE);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<NotificationLogStatusFilter>(ALL_FILTER_VALUE);
  const [historyTestFilter, setHistoryTestFilter] = useState<NotificationLogTestFilter>('ALL');
  const [selectedNotificationLogId, setSelectedNotificationLogId] = useState('');
  const debouncedHistorySearch = useDebounce(historySearchInput);

  const {
    data: notificationLogsData,
    isLoading: isNotificationLogsLoading,
  } = useNotificationLogs({
    page: historyPage,
    limit: NOTIFICATION_LOGS_LIMIT,
    search: debouncedHistorySearch.trim() || undefined,
    channel: historyChannelFilter === ALL_FILTER_VALUE ? undefined : historyChannelFilter,
    event: historyEventFilter === ALL_FILTER_VALUE ? undefined : historyEventFilter,
    status: historyStatusFilter === ALL_FILTER_VALUE ? undefined : historyStatusFilter,
    testSend: historyTestFilter === 'ALL'
      ? undefined
      : historyTestFilter === 'TEST',
  });

  const notificationLogs = notificationLogsData?.data.logs ?? [];
  const notificationLogsTotalPages = notificationLogsData?.data.pagination.totalPages ?? 1;
  const notificationLogColumns: Array<ColumnDef<NotificationLogListItem>> = [
    {
      accessorKey: 'queuedAt',
      header: 'Queued',
      cell: ({ row }) => formatNotificationDate(row.original.queuedAt),
    },
    {
      accessorKey: 'event',
      header: 'Event',
      cell: ({ row }) => getNotificationLogEventLabel(row.original.event),
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      cell: ({ row }) => (
        <Badge variant="secondary">{getNotificationChannelLabel(row.original.channel)}</Badge>
      ),
    },
    {
      id: 'recipient',
      header: 'Recipient',
      cell: ({ row }) => (
        <span className="font-medium">{getNotificationLogRecipient(row.original)}</span>
      ),
    },
    {
      id: 'provider',
      header: 'Provider',
      cell: ({ row }) => getNotificationProviderLabel(row.original),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === NotificationLogStatus.FAILED ? 'destructive' : 'outline'}>
          {getNotificationLogStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'attemptCount',
      header: 'Attempts',
      cell: ({ row }) => row.original.attemptCount,
    },

    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => setSelectedNotificationLogId(row.original.id)}
          >
            <EyeIcon className="size-3.5" />
            View
          </Button>
        </div>
      ),
    },
  ];

  function resetFilters() {
    setHistorySearchInput('');
    setHistoryChannelFilter(ALL_FILTER_VALUE);
    setHistoryEventFilter(ALL_FILTER_VALUE);
    setHistoryStatusFilter(ALL_FILTER_VALUE);
    setHistoryTestFilter('ALL');
    setHistoryPage(1);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification History</CardTitle>
            <CardDescription>
              Review queued, retried, sent, and failed notifications, including test sends.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={historySearchInput}
                    onChange={(event) => {
                    setHistorySearchInput(event.target.value);
                    setHistoryPage(1);
                  }}
                    placeholder="Search recipient, subject, content, or error"
                    className="pl-9"
                />
              </div>

              <Select
                  value={historyChannelFilter}
                  onValueChange={(value) => {
                    if (value === ALL_FILTER_VALUE || isNotificationChannel(value)) {
                      setHistoryChannelFilter(value);
                      setHistoryPage(1);
                    }
                  }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All channels</SelectItem>
                  <SelectItem value={NotificationChannel.EMAIL}>Email</SelectItem>
                  <SelectItem value={NotificationChannel.SMS}>SMS</SelectItem>
                </SelectContent>
              </Select>

              <Select
                  value={historyEventFilter}
                  onValueChange={(value) => {
                    if (value === ALL_FILTER_VALUE || isNotificationEvent(value)) {
                      setHistoryEventFilter(value);
                      setHistoryPage(1);
                    }
                  }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All events</SelectItem>
                  {NOTIFICATION_EVENTS.map((event) => (
                    <SelectItem key={event} value={event}>
                      {NOTIFICATION_EVENT_LABELS[event]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                  value={historyStatusFilter}
                  onValueChange={(value) => {
                    if (value === ALL_FILTER_VALUE || isNotificationLogStatus(value)) {
                      setHistoryStatusFilter(value);
                      setHistoryPage(1);
                    }
                  }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
                  {NOTIFICATION_LOG_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {NOTIFICATION_LOG_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                  value={historyTestFilter}
                  onValueChange={(value) => {
                    if (isNotificationLogTestFilter(value)) {
                      setHistoryTestFilter(value);
                      setHistoryPage(1);
                    }
                  }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="TEST">Test</SelectItem>
                  <SelectItem value="LIVE">Live</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" className="w-full xl:w-auto" onClick={resetFilters}>
                Reset
              </Button>
            </div>

            <div className="md:hidden">
              <NotificationHistoryMobileList
                  notificationLogs={notificationLogs}
                  isLoading={isNotificationLogsLoading}
                  onViewDetails={setSelectedNotificationLogId}
              />
            </div>

            <div className="hidden md:block">
              <DataTable
                  columns={notificationLogColumns}
                  data={notificationLogs}
                  isLoading={isNotificationLogsLoading}
              />
            </div>

            <Pagination
                page={historyPage}
                totalPages={notificationLogsTotalPages}
                onPageChange={setHistoryPage}
                isLoading={isNotificationLogsLoading}
            />
          </CardContent>
        </Card>
      </div>

      <NotificationLogDetailsModal
          open={Boolean(selectedNotificationLogId)}
          onOpenChange={(open) => {
          if (!open) {
            setSelectedNotificationLogId('');
          }
        }}
          notificationLogId={selectedNotificationLogId}
      />
    </>
  );
}

function NotificationHistoryMobileList({
  notificationLogs,
  isLoading,
  onViewDetails,
}: {
  notificationLogs: Array<NotificationLogListItem>;
  isLoading: boolean;
  onViewDetails: (notificationLogId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
              key={index}
              className="rounded-xl border border-border/70 bg-muted/10 px-4 py-4"
          >
            <div className="h-4 w-2/5 animate-pulse rounded-sm bg-muted" />
            <div className="mt-3 h-3 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="mt-2 h-3 w-full animate-pulse rounded-sm bg-muted" />
            <div className="mt-4 h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (notificationLogs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No results.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {notificationLogs.map((notificationLog) => (
        <div
            key={notificationLog.id}
            className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/[0.03]"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Queued
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatNotificationDate(notificationLog.queuedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{getNotificationChannelLabel(notificationLog.channel)}</Badge>
                <Badge variant={notificationLog.status === NotificationLogStatus.FAILED ? 'destructive' : 'outline'}>
                  {getNotificationLogStatusLabel(notificationLog.status)}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <HistoryDetailItem label="Event" value={getNotificationLogEventLabel(notificationLog.event)} />
              <HistoryDetailItem label="Recipient" value={getNotificationLogRecipient(notificationLog)} />
              <HistoryDetailItem label="Provider" value={getNotificationProviderLabel(notificationLog)} />
              <HistoryDetailItem label="Attempts" value={String(notificationLog.attemptCount)} />
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => onViewDetails(notificationLog.id)}
            >
              <EyeIcon className="size-3.5" />
              View Details
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-foreground">
        {value}
      </p>
    </div>
  );
}
