import { NotificationChannel } from '@workspace/constants';
import { Loader2Icon, MailIcon, MessageSquareTextIcon } from 'lucide-react';
import { useDeferredValue } from 'react';
import {
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import { useNotificationTemplatePreview } from '@/app/hooks/use-notifications';

interface NotificationTemplatePreviewCardProps {
  channel: NotificationChannel;
  subject?: string;
  content: Record<string, unknown> | string;
}

export function NotificationTemplatePreviewCard(props: NotificationTemplatePreviewCardProps) {
  const deferredEmailContent = useDeferredValue(
    props.channel === NotificationChannel.EMAIL && typeof props.content !== 'string' ? props.content : {},
  );
  const deferredSmsContent = useDeferredValue(
    props.channel === NotificationChannel.SMS && typeof props.content === 'string' ? props.content : '',
  );
  const deferredSubject = useDeferredValue(
    props.channel === NotificationChannel.EMAIL ? props.subject ?? '' : '',
  );
  const previewInput = props.channel === NotificationChannel.EMAIL
    ? {
      channel: NotificationChannel.EMAIL as const,
      subject: deferredSubject.trim() || 'Notification',
      content: deferredEmailContent,
    }
    : {
      channel: NotificationChannel.SMS as const,
      content: deferredSmsContent,
    };
  const {
    data,
    error,
    isLoading,
    isFetching,
  } = useNotificationTemplatePreview(previewInput);

  const isEmailPreview = props.channel === NotificationChannel.EMAIL;
  const emailSubject = isEmailPreview ? props.subject ?? '' : '';
  const smsContent = !isEmailPreview && typeof props.content === 'string' ? props.content : '';
  const emailPreview = data?.data.channel === NotificationChannel.EMAIL
    ? data.data.preview as { html: string; subject: string }
    : null;
  const smsPreview = data?.data.channel === NotificationChannel.SMS
    ? data.data.preview as { text: string }
    : null;

  return (
    <SectionCard>
      <SectionCardHeader className="flex flex-col gap-1 border-b border-border/70 pb-4">
        <span className="text-sm font-semibold">
          {isEmailPreview ? 'Rendered Email Preview' : 'Rendered SMS Preview'}
        </span>
        <p className="text-sm text-muted-foreground">
          {isEmailPreview
            ? 'This preview uses the system email shell and the same placeholder rendering as real sends.'
            : 'This preview shows the final SMS body after placeholder values are resolved.'}
        </p>
      </SectionCardHeader>

      <SectionCardContent className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load notification template preview.'}
          </div>
        ) : isEmailPreview ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Subject
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                  {emailPreview?.subject ?? (emailSubject.trim() || 'Notification')}
                </p>
              </div>
              {isLoading || isFetching ? (
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <MailIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <iframe
                title="Rendered notification email preview"
                srcDoc={emailPreview?.html ?? ''}
                className="h-144 w-full rounded-xl border border-border/70 bg-white"
                sandbox=""
            />
          </>
        ) : (
          <div className="space-y-4 rounded-xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.3),hsl(var(--background)))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageSquareTextIcon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">SMS Preview</p>
                  <p className="text-xs text-muted-foreground">Rendered sample message</p>
                </div>
              </div>
              {isLoading || isFetching ? (
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            <div className="flex min-h-36 items-start bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.06),transparent_55%)]">
              <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
                {smsPreview?.text ?? smsContent}
              </div>
            </div>
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}
