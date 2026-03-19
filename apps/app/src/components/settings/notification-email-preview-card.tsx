import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  NotificationChannel,
  NotificationEvent,
} from '@workspace/constants';
import { Loader2Icon } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import {
  Field,
  FieldLabel,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui';
import { getNotificationEventChannels, isNotificationEvent } from '@/app/components/settings/notifications/utils';
import { useNotificationEmailPreview } from '@/app/hooks/use-notifications';

interface NotificationEmailPreviewCardProps {
  subject: string;
  content: Record<string, unknown>;
}

const EMAIL_PREVIEW_EVENTS = NOTIFICATION_EVENTS.filter((event) =>
  getNotificationEventChannels(event).includes(NotificationChannel.EMAIL),
);

export function NotificationEmailPreviewCard({
  subject,
  content,
}: NotificationEmailPreviewCardProps) {
  const [selectedEvent, setSelectedEvent] = useState<NotificationEvent>(
    EMAIL_PREVIEW_EVENTS[0] ?? NotificationEvent.LOAN_CREATED,
  );
  const deferredSubject = useDeferredValue(subject);
  const deferredContent = useDeferredValue(content);
  const {
    data,
    error,
    isLoading,
    isFetching,
  } = useNotificationEmailPreview({
    event: selectedEvent,
    subject: deferredSubject.trim() || 'Notification',
    content: deferredContent,
  });

  const renderedPreview = data?.data.preview ?? null;

  return (
    <SectionCard>
      <SectionCardHeader className="flex flex-col gap-3 border-b border-border/70 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Rendered Email Preview</span>
          <p className="text-sm text-muted-foreground">
            This preview uses the same system email shell and placeholder rendering as real sends.
          </p>
        </div>

        <Field className="w-full">
          <FieldLabel htmlFor="notification-email-preview-event">Preview Event</FieldLabel>
          <Select
              value={selectedEvent}
              onValueChange={(value) => {
                if (isNotificationEvent(value)) {
                  setSelectedEvent(value);
                }
              }}
          >
            <SelectTrigger id="notification-email-preview-event" className="w-full">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_PREVIEW_EVENTS.map((event) => (
                <SelectItem key={event} value={event}>
                  {NOTIFICATION_EVENT_LABELS[event]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </SectionCardHeader>

      <SectionCardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Subject
              </p>
              <p className="truncate text-sm font-medium text-foreground">
                {renderedPreview?.subject ?? (subject.trim() || 'Notification')}
              </p>
            </div>
            {isLoading || isFetching ? (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {error ? (
            <div className="px-4 py-6 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load rendered email preview.'}
            </div>
          ) : (
            <iframe
                title="Rendered notification email preview"
                srcDoc={renderedPreview?.html ?? ''}
                className="h-144 w-full rounded-b-xl bg-white"
                sandbox=""
            />
          )}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
}
