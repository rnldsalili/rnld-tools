import { useForm } from '@tanstack/react-form';
import {
  NotificationChannel,
} from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can } from '@workspace/permissions/react';
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
import { NotificationTemplatePreviewCard } from '@/app/components/settings/notification-template-preview-card';
import { NotificationTestSendModal } from '@/app/components/settings/notification-test-send-modal';
import { isPlainRecord, toPlainRecord } from '@/app/lib/value-guards';

interface NotificationTemplateEditorFormProps {
  formId: string;
  template: NotificationTemplate;
  isReadOnly?: boolean;
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
  isReadOnly = false,
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
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">Template Details</span>
                  <Badge variant="secondary">{getNotificationChannelLabel(template.channel)}</Badge>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                  <Can I={PermissionAction.MANAGE} a={PermissionModule.NOTIFICATIONS}>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 sm:w-auto"
                        onClick={() => setIsTestSendOpen(true)}
                    >
                      <SendHorizontalIcon className="size-3.5" />
                      Test Send
                    </Button>
                  </Can>
                  <Can I={PermissionAction.MANAGE} a={PermissionModule.NOTIFICATIONS}>
                    <Button type="submit" disabled={isSaving} className="w-full gap-2 sm:w-auto">
                      {isSaving ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
                      Save
                    </Button>
                  </Can>
                  <Can I={PermissionAction.MANAGE} a={PermissionModule.NOTIFICATIONS}>
                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full gap-2 sm:w-auto"
                        onClick={onDelete}
                        disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                      Delete
                    </Button>
                  </Can>
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
                            readOnly={isReadOnly}
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
                            readOnly={isReadOnly}
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
                                readOnly={isReadOnly}
                            />
                          </Field>
                        )}
                      </form.Field>

                      <form.Field name="content">
                        {(field) => (
                          <Field>
                            <div className="space-y-1">
                              <FieldLabel>Email Body</FieldLabel>
                              <p className="text-sm text-muted-foreground">
                                The system email shell manages the header, footer, spacing, and brand styling.
                                This editor only controls the inner body content stored with the template.
                              </p>
                            </div>
                            <AgreementEditor
                                content={isPlainRecord(field.state.value) ? field.state.value : {}}
                                onChange={field.handleChange}
                                placeholder="Write your email content here..."
                                editable={!isReadOnly}
                            />
                          </Field>
                        )}
                      </form.Field>

                      <NotificationTemplatePreviewCard
                          channel={NotificationChannel.EMAIL}
                          subject={formValues.channel === NotificationChannel.EMAIL ? formValues.subject : ''}
                          content={isPlainRecord(formValues.content) ? formValues.content : {}}
                      />
                    </>
                  ) : (
                    <>
                      <form.Field name="content">
                        {(field) => (
                          <Field>
                            <FieldLabel htmlFor={field.name}>SMS Content</FieldLabel>
                            <Textarea
                                id={field.name}
                                value={typeof field.state.value === 'string' ? field.state.value : ''}
                                onChange={(event) => field.handleChange(event.target.value)}
                                rows={12}
                                placeholder="Write the SMS content here..."
                                readOnly={isReadOnly}
                            />
                          </Field>
                        )}
                      </form.Field>

                      <NotificationTemplatePreviewCard
                          channel={NotificationChannel.SMS}
                          content={typeof formValues.content === 'string' ? formValues.content : ''}
                      />
                    </>
                  )}
                </div>
              </SectionCardContent>
            </SectionCard>
          </div>

          <div className="w-full xl:w-80 xl:shrink-0">
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
