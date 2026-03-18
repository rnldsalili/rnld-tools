import { useForm } from '@tanstack/react-form';
import {
  NOTIFICATION_SMS_CONTENT_MAX_LENGTH,
  NotificationChannel,
} from '@workspace/constants';
import {
  Loader2Icon,
  SaveIcon,
  SendHorizontalIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Field,
  FieldLabel,
  Input,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  Textarea,
} from '@workspace/ui';
import type {
  NotificationTemplate,
  NotificationTemplateFormValues,
} from '@/app/hooks/use-notifications';
import { AgreementEditor } from '@/app/components/settings/agreement-editor';
import { getNotificationChannelLabel } from '@/app/components/settings/notifications/utils';
import { NotificationPlaceholderPanel } from '@/app/components/settings/notification-placeholder-panel';
import { NotificationTestSendModal } from '@/app/components/settings/notification-test-send-modal';
import { isPlainRecord, toPlainRecord } from '@/app/lib/value-guards';

interface NotificationTemplateEditorFormProps {
  formId: string;
  template: NotificationTemplate;
  isSaving?: boolean;
  isDeleting?: boolean;
  onSubmit: (values: NotificationTemplateFormValues) => Promise<void>;
  onDelete: () => void;
}

function getDefaultValues(template: NotificationTemplate) {
  if (template.channel === NotificationChannel.EMAIL) {
    return {
      channel: NotificationChannel.EMAIL,
      name: template.name,
      description: template.description ?? '',
      subject: template.subject ?? '',
      content: toPlainRecord(template.content),
    } as const;
  }

  return {
    channel: NotificationChannel.SMS,
    name: template.name,
    description: template.description ?? '',
    content: typeof template.content === 'string' ? template.content : '',
  } as const;
}

export function NotificationTemplateEditorForm({
  formId,
  template,
  isSaving = false,
  isDeleting = false,
  onSubmit,
  onDelete,
}: NotificationTemplateEditorFormProps) {
  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const form = useForm({
    defaultValues: getDefaultValues(template),
    onSubmit: async ({ value }) => {
      if (value.channel === NotificationChannel.EMAIL) {
        await onSubmit({
          channel: value.channel,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          subject: value.subject.trim(),
          content: value.content,
        });
        return;
      }

      await onSubmit({
        channel: value.channel,
        name: value.name.trim(),
        description: value.description.trim() || undefined,
        content: value.content.trim(),
      });
    },
  });

  const formValues = form.state.values;

  return (
    <>
      <form
          id={formId}
          onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <SectionCard>
              <SectionCardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Template Details</span>
                  <Badge variant="secondary">{getNotificationChannelLabel(template.channel)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setIsTestSendOpen(true)}
                  >
                    <SendHorizontalIcon className="size-3.5" />
                    Test Send
                  </Button>
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
                    Save
                  </Button>
                  <Button
                      type="button"
                      variant="destructive"
                      className="gap-2"
                      onClick={onDelete}
                      disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                    Delete
                  </Button>
                </div>
              </SectionCardHeader>
              <SectionCardContent>
                <div className="flex flex-col gap-4">
                  <form.Field name="name">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Template Name</FieldLabel>
                        <Input
                            id={field.name}
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="e.g. Loan Created Email"
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="description">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                        <Textarea
                            id={field.name}
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                            rows={3}
                            placeholder="Describe when this template should be used."
                        />
                      </Field>
                    )}
                  </form.Field>

                  {template.channel === NotificationChannel.EMAIL ? (
                    <>
                      <form.Field name="subject">
                        {(field) => (
                          <Field>
                            <FieldLabel htmlFor={field.name}>Email Subject</FieldLabel>
                            <Input
                                id={field.name}
                                value={field.state.value}
                                onChange={(event) => field.handleChange(event.target.value)}
                                placeholder="Subject line for this email"
                            />
                          </Field>
                        )}
                      </form.Field>

                      <form.Field name="content">
                        {(field) => (
                          <Field>
                            <FieldLabel>Body</FieldLabel>
                            <AgreementEditor
                                content={isPlainRecord(field.state.value) ? field.state.value : {}}
                                onChange={field.handleChange}
                                placeholder="Write your email content here..."
                            />
                          </Field>
                        )}
                      </form.Field>
                    </>
                  ) : (
                    <form.Field name="content">
                      {(field) => (
                        <Field>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel htmlFor={field.name}>SMS Content</FieldLabel>
                            <span className="text-xs text-muted-foreground">
                              {(typeof field.state.value === 'string' ? field.state.value : '').length}/{NOTIFICATION_SMS_CONTENT_MAX_LENGTH}
                            </span>
                          </div>
                          <Textarea
                              id={field.name}
                              value={typeof field.state.value === 'string' ? field.state.value : ''}
                              onChange={(event) => field.handleChange(event.target.value)}
                              rows={12}
                              maxLength={NOTIFICATION_SMS_CONTENT_MAX_LENGTH}
                              placeholder="Write the SMS content here..."
                          />
                        </Field>
                      )}
                    </form.Field>
                  )}
                </div>
              </SectionCardContent>
            </SectionCard>
          </div>

          <div className="xl:w-80 xl:shrink-0">
            <NotificationPlaceholderPanel />
          </div>
        </div>
      </form>

      <NotificationTestSendModal
          open={isTestSendOpen}
          onOpenChange={setIsTestSendOpen}
          channel={template.channel}
          templateId={template.id}
          templateName={formValues.name.trim() || template.name}
          subject={formValues.channel === NotificationChannel.EMAIL ? formValues.subject : undefined}
          content={formValues.content}
      />
    </>
  );
}
