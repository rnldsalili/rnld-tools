import { Loader2Icon, MailIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import {
  Button,
  Card,
  CardContent,
} from '@workspace/ui';
import type { NotificationTemplateFormValues, NotificationTemplateListItem  } from '@/app/hooks/use-notifications';
import { ConfirmDeleteDialog } from '@/app/components/confirm-delete-dialog';
import { NotificationCreateTemplateModal } from '@/app/components/settings/notifications/notification-create-template-modal';
import { NotificationTemplateLibrary } from '@/app/components/settings/notifications/notification-template-library';
import { NotificationTemplateEditorForm } from '@/app/components/settings/notification-template-editor-form';
import {
  useDeleteNotificationTemplate,
  useNotificationTemplate,
  useNotificationTemplates,
  useUpdateNotificationTemplate,
} from '@/app/hooks/use-notifications';

const EDIT_TEMPLATE_FORM_ID = 'edit-notification-template-form';

export function NotificationTemplatesSection() {
  const { data: templatesData, isLoading: isTemplatesLoading } = useNotificationTemplates();
  const { mutateAsync: updateTemplate, isPending: isUpdatePending } = useUpdateNotificationTemplate();
  const { mutateAsync: deleteTemplate, isPending: isDeletePending } = useDeleteNotificationTemplate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templatePendingDelete, setTemplatePendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const templates: Array<NotificationTemplateListItem> = [...(templatesData?.data.templates ?? [])].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

    if (nameComparison !== 0) {
      return nameComparison;
    }

    const channelComparison = left.channel.localeCompare(right.channel);

    if (channelComparison !== 0) {
      return channelComparison;
    }

    return left.id.localeCompare(right.id);
  });
  const effectiveSelectedTemplateId = templates.some((template) => template.id === selectedTemplateId)
    ? selectedTemplateId
    : (templates[0]?.id ?? '');
  const { data: selectedTemplateData, isLoading: isSelectedTemplateLoading } = useNotificationTemplate(
    effectiveSelectedTemplateId,
  );
  const selectedTemplate = selectedTemplateData?.data.template ?? null;
  const canManageNotifications = useCan(PermissionModule.NOTIFICATIONS, PermissionAction.MANAGE);

  async function handleSaveTemplate(values: NotificationTemplateFormValues) {
    if (!effectiveSelectedTemplateId) {
      return;
    }

    try {
      await updateTemplate({
        id: effectiveSelectedTemplateId,
        ...values,
      });
      toast.success('Notification template saved.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function handleDeleteTemplate() {
    if (!templatePendingDelete) {
      return;
    }

    try {
      await deleteTemplate(templatePendingDelete.id);
      setTemplatePendingDelete(null);
      if (effectiveSelectedTemplateId === templatePendingDelete.id) {
        setSelectedTemplateId('');
      }
      toast.success('Notification template deleted.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-w-0">
          <NotificationTemplateLibrary
              templates={templates}
              isLoading={isTemplatesLoading}
              selectedTemplateId={effectiveSelectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
              action={(
              <Can I={PermissionAction.MANAGE} a={PermissionModule.NOTIFICATIONS}>
                <Button type="button" className="gap-2" onClick={() => setIsCreateOpen(true)}>
                  <PlusIcon className="size-3.5" />
                  New Template
                </Button>
              </Can>
            )}
          />
        </div>

        <div className="min-w-0">
          {isSelectedTemplateLoading ? (
            <Card>
              <CardContent className="flex justify-center py-10">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : selectedTemplate ? (
            <NotificationTemplateEditorForm
                key={selectedTemplate.id}
                formId={EDIT_TEMPLATE_FORM_ID}
                template={selectedTemplate}
                isReadOnly={!canManageNotifications}
                isSaving={isUpdatePending}
                isDeleting={isDeletePending}
                onSubmit={handleSaveTemplate}
                onDelete={() => setTemplatePendingDelete({
                id: selectedTemplate.id,
                name: selectedTemplate.name,
              })}
            />
          ) : (
            <Card>
              <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                  <MailIcon className="size-5" />
                </div>
                <div>
                  <p className="font-medium">Select a template</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a template from the library or create a new one to start editing.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Can I={PermissionAction.MANAGE} a={PermissionModule.NOTIFICATIONS}>
        <NotificationCreateTemplateModal
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onCreated={setSelectedTemplateId}
        />
      </Can>

      <Can I={PermissionAction.MANAGE} a={PermissionModule.NOTIFICATIONS}>
        <ConfirmDeleteDialog
            open={Boolean(templatePendingDelete)}
            onOpenChange={(open) => {
              if (!open) {
                setTemplatePendingDelete(null);
              }
            }}
            title="Delete Notification Template"
            description={`Delete "${templatePendingDelete?.name ?? ''}"? This cannot be undone.`}
            confirmLabel="Delete"
            isPending={isDeletePending}
            onConfirm={handleDeleteTemplate}
        />
      </Can>
    </>
  );
}
