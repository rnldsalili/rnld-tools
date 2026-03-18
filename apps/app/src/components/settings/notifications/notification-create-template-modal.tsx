import { useForm } from '@tanstack/react-form';
import { NotificationChannel } from '@workspace/constants';
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
  Textarea,
} from '@workspace/ui';
import { useCreateNotificationTemplate } from '@/app/hooks/use-notifications';

const CREATE_TEMPLATE_FORM_ID = 'create-notification-template-form';

interface NotificationCreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function NotificationCreateTemplateModal({
  open,
  onOpenChange,
  onCreated,
}: NotificationCreateTemplateModalProps) {
  const { mutateAsync: createTemplate, isPending } = useCreateNotificationTemplate();
  const form = useForm({
    defaultValues: {
      channel: NotificationChannel.EMAIL,
      name: '',
      description: '',
    },
    onSubmit: async ({ value }) => {
      try {
        const createdTemplate = await createTemplate({
          channel: value.channel,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
        });

        toast.success('Notification template created.');
        onCreated(createdTemplate.data.template.id);
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create notification template.');
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
        title="New Notification Template"
        className="sm:max-w-lg"
        footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={CREATE_TEMPLATE_FORM_ID} disabled={isPending} className="gap-2">
            {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
            Create
          </Button>
        </div>
      )}
    >
      <form
          id={CREATE_TEMPLATE_FORM_ID}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.Field name="channel">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Channel</FieldLabel>
              <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as NotificationChannel)}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NotificationChannel.EMAIL}>Email</SelectItem>
                  <SelectItem value={NotificationChannel.SMS}>SMS</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

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
                  placeholder="Describe what this notification is for."
              />
            </Field>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}
