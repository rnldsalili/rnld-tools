import { useForm } from '@tanstack/react-form';
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from '@workspace/constants';
import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@workspace/ui';
import { toast } from 'sonner';
import type { ClientDetail } from '@/app/hooks/use-client';
import {  useUpdateClient } from '@/app/hooks/use-client';
import { toFieldErrors } from '@/app/lib/form';
import { isOneOf } from '@/app/lib/value-guards';

const CLIENT_EDIT_FORM_ID = 'edit-client-form';

interface EditClientDialogProps {
  client: ClientDetail;
  onClose: () => void;
}

export function EditClientDialog({ client, onClose }: EditClientDialogProps) {
  const { mutateAsync, isPending } = useUpdateClient();

  const form = useForm({
    defaultValues: {
      address: client.address ?? '',
      email: client.email ?? '',
      name: client.name,
      phone: client.phone ?? '',
      status: client.status,
    },
    onSubmit: async ({ value }) => {
      try {
        await mutateAsync({
          clientId: client.id,
          body: {
            address: value.address.trim() || null,
            email: value.email.trim() || null,
            name: value.name.trim(),
            phone: value.phone.trim() || null,
            status: value.status,
          },
        });
        toast.success('Client updated successfully.');
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update client.');
      }
    },
  });

  return (
    <Modal
        open
        onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
        title="Edit Client"
        className="sm:max-w-lg"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={CLIENT_EDIT_FORM_ID} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </>
      )}
    >
      <form
          id={CLIENT_EDIT_FORM_ID}
          onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
              name="name"
              validators={{
              onChange: ({ value }) => (!value.trim() ? 'Full name is required' : undefined),
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                <FieldLabel htmlFor={field.name}>
                  Full Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldError errors={toFieldErrors(field.state.meta.errors)} />
              </Field>
            )}
          </form.Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field name="phone">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                  <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field
                name="email"
                validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return undefined;
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                    ? undefined
                    : 'Invalid email address';
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                      id={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="status">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  Status <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (isOneOf(CLIENT_STATUSES, value)) {
                        field.handleChange(value);
                      }
                    }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CLIENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {CLIENT_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                <Textarea
                    id={field.name}
                    rows={4}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </form>
    </Modal>
  );
}
