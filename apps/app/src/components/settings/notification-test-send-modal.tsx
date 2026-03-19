import { useForm } from '@tanstack/react-form';
import {
  NOTIFICATION_EMAIL_PROVIDERS,
  NOTIFICATION_EMAIL_PROVIDER_LABELS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_SMS_PROVIDERS,
  NOTIFICATION_SMS_PROVIDER_LABELS,
  NotificationChannel,
  NotificationEmailProvider,
  NotificationEvent,
} from '@workspace/constants';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Field,
  FieldLabel,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui';
import {
  getNotificationEventChannels,
  isNotificationEmailProvider,
  isNotificationEvent,
  isNotificationSmsProvider,
} from '@/app/components/settings/notifications/utils';
import { useTestNotification } from '@/app/hooks/use-notifications';
import { DEFAULT_SMS_NOTIFICATION_PROVIDER } from '@/app/lib/notifications';
import { isPlainRecord } from '@/app/lib/value-guards';

const TEST_SEND_FORM_ID = 'notification-test-send-form';

interface NotificationTestSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: NotificationChannel;
  templateId?: string | null;
  templateName: string;
  subject?: string;
  content: Record<string, unknown> | string;
}

export function NotificationTestSendModal({
  open,
  onOpenChange,
  channel,
  templateId,
  templateName,
  subject,
  content,
}: NotificationTestSendModalProps) {
  const { mutateAsync: testNotification, isPending } = useTestNotification();
  const supportedEvents = Object.values(NotificationEvent).filter((event) => (
    getNotificationEventChannels(event).includes(channel)
  ));
  const form = useForm({
    defaultValues: {
      event: supportedEvents[0] ?? NotificationEvent.LOAN_CREATED,
      emailProvider: NotificationEmailProvider.BREVO,
      smsProvider: DEFAULT_SMS_NOTIFICATION_PROVIDER,
      recipientEmail: '',
      recipientName: '',
      recipientPhone: '',
    },
    onSubmit: async ({ value }) => {
      try {
        if (channel === NotificationChannel.EMAIL) {
          if (!isPlainRecord(content)) {
            throw new Error('Email template content is invalid.');
          }

          await testNotification({
            channel,
            event: value.event,
            templateId: templateId ?? null,
            templateName,
            recipientEmail: value.recipientEmail.trim(),
            recipientName: value.recipientName.trim() || undefined,
            emailProvider: value.emailProvider,
            subject: subject ?? templateName,
            content,
          });
        } else {
          await testNotification({
            channel,
            event: value.event,
            templateId: templateId ?? null,
            templateName,
            recipientPhone: value.recipientPhone.trim(),
            smsProvider: value.smsProvider,
            content: String(content),
          });
        }

        toast.success(`${channel === NotificationChannel.EMAIL ? 'Email' : 'SMS'} notification queued successfully.`);
        onOpenChange(false);
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={`Test ${channel === NotificationChannel.EMAIL ? 'Email' : 'SMS'} Notification`}
        className="sm:max-w-lg"
        footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={TEST_SEND_FORM_ID} disabled={isPending} className="gap-2">
            {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
            Queue Test Send
          </Button>
        </div>
      )}
    >
      <form
          id={TEST_SEND_FORM_ID}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.Field name="event">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Event Context</FieldLabel>
              <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (isNotificationEvent(value)) {
                      field.handleChange(value);
                    }
                  }}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {supportedEvents.map((event) => (
                    <SelectItem key={event} value={event}>
                      {NOTIFICATION_EVENT_LABELS[event]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        {channel === NotificationChannel.EMAIL ? (
          <>
            <form.Field name="emailProvider">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Provider</FieldLabel>
                  <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (isNotificationEmailProvider(value)) {
                          field.handleChange(value);
                        }
                      }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_EMAIL_PROVIDERS.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {NOTIFICATION_EMAIL_PROVIDER_LABELS[provider]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="recipientEmail">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Recipient Email</FieldLabel>
                  <Input
                      id={field.name}
                      type="email"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="name@example.com"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="recipientName">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Recipient Name</FieldLabel>
                  <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Optional"
                  />
                </Field>
              )}
            </form.Field>
          </>
        ) : (
          <>
            <form.Field name="smsProvider">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Provider</FieldLabel>
                  <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (isNotificationSmsProvider(value)) {
                          field.handleChange(value);
                        }
                      }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_SMS_PROVIDERS.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {NOTIFICATION_SMS_PROVIDER_LABELS[provider]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="recipientPhone">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Recipient Phone</FieldLabel>
                  <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="09171234567"
                  />
                </Field>
              )}
            </form.Field>
          </>
        )}
      </form>
    </Modal>
  );
}
