import { useForm } from '@tanstack/react-form';
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS, ClientStatus } from '@workspace/constants';
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
import { useCreateClient } from '@/app/hooks/use-client';
import { toFieldErrors } from '@/app/lib/form';

const CLIENT_FORM_ID = 'create-client-form';

interface CreateClientDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const DEFAULT_VALUES = {
  address: '',
  email: '',
  name: '',
  phone: '',
  status: ClientStatus.ENABLED,
};

export function CreateClientDialog({ onOpenChange, open }: CreateClientDialogProps) {
  const { mutateAsync, isPending } = useCreateClient();

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      try {
        await mutateAsync({
          address: value.address.trim() || undefined,
          email: value.email.trim() || undefined,
          name: value.name.trim(),
          phone: value.phone.trim() || undefined,
          status: value.status,
        });
        toast.success('Client created successfully.');
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create client.');
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
        title="New Client"
        className="sm:max-w-lg"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={CLIENT_FORM_ID} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Client'}
          </Button>
        </>
      )}
    >
      <form
          id={CLIENT_FORM_ID}
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
                    placeholder="Full name"
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
                      placeholder="+63 9XX XXX XXXX"
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
                      placeholder="client@example.com"
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
                <Select value={field.state.value} onValueChange={(value) => field.handleChange(value as ClientStatus)}>
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
                    placeholder="Street, barangay, city, province"
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </form>
    </Modal>
  );
}
