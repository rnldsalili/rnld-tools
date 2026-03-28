import { useForm } from '@tanstack/react-form';
import { useRouter } from '@tanstack/react-router';
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  ClientStatus,
  PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE,
  isPhilippineMobileNumber,
  normalizePhilippineMobileNumber,
} from '@workspace/constants';
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
import { Loader2Icon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type * as React from 'react';
import { useCreateClient } from '@/app/hooks/use-client';
import { toFieldErrors } from '@/app/lib/form';
import { isOneOf } from '@/app/lib/value-guards';

const CLIENT_FORM_ID = 'create-client-form';

interface CreateClientFormValues {
  address: string;
  email: string;
  name: string;
  phone: string;
  status: ClientStatus;
}

const DEFAULT_VALUES: CreateClientFormValues = {
  address: '',
  email: '',
  name: '',
  phone: '',
  status: ClientStatus.ENABLED,
};

function validateOptionalPhoneNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return isPhilippineMobileNumber(trimmedValue)
    ? undefined
    : PHILIPPINE_MOBILE_NUMBER_ERROR_MESSAGE;
}

function validateOptionalEmail(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? undefined
    : 'Invalid email address';
}

function buildCreateClientPayload(value: CreateClientFormValues) {
  const trimmedPhone = value.phone.trim();

  return {
    address: value.address.trim() || undefined,
    email: value.email.trim() || undefined,
    name: value.name.trim(),
    phone: trimmedPhone ? normalizePhilippineMobileNumber(trimmedPhone) : undefined,
    status: value.status,
  };
}

export function CreateClientForm() {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateClient();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: () => {
      setIsConfirmationOpen(true);
    },
  });

  async function handleConfirmCreate() {
    try {
      const createdClientResponse = await mutateAsync(buildCreateClientPayload(form.state.values));

      toast.success('Client created successfully.');

      await router.navigate({
        to: '/clients/$clientId',
        params: { clientId: createdClientResponse.data.client.id },
      });
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function handleConfirmationOpenChange(nextOpen: boolean) {
    if (isPending) {
      return;
    }

    setIsConfirmationOpen(nextOpen);
  }

  return (
    <>
      <form
          id={CLIENT_FORM_ID}
          onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
          className="flex min-h-full flex-col gap-6"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
          <section className="space-y-6">
            <SectionHeading
                icon={UserIcon}
                title="Client Details"
            />

            <div className="mx-auto w-full max-w-3xl">
              <FieldGroup className="gap-5">
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

                <div className="grid gap-4">
                  <form.Field
                      name="phone"
                      validators={{
                      onChange: ({ value }) => validateOptionalPhoneNumber(value),
                    }}
                  >
                    {(field) => (
                      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                        <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                        <Input
                            id={field.name}
                            type="tel"
                            inputMode="tel"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder="09171234567 or +639171234567"
                        />
                        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <div className="grid gap-4">
                  <form.Field
                      name="email"
                      validators={{
                      onChange: ({ value }) => validateOptionalEmail(value),
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
                          rows={7}
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                          placeholder="Street, barangay, city, province"
                      />
                    </Field>
                  )}
                </form.Field>

                <div className="border-t border-border/60 pt-5">
                  <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Quick Review</h3>
                      <p className="text-sm text-muted-foreground">
                        The confirmation modal will show this same information before saving.
                      </p>
                    </div>

                    <form.Subscribe selector={(state) => state.values}>
                      {(formValues) => (
                        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                          <SummaryField label="Full Name" value={formValues.name.trim() || '—'} />
                          <SummaryField label="Status" value={CLIENT_STATUS_LABELS[formValues.status]} />
                          <SummaryField label="Phone" value={formValues.phone.trim() || '—'} />
                          <SummaryField label="Email" value={formValues.email.trim() || '—'} />
                          <SummaryField
                              label="Address"
                              value={formValues.address.trim() || '—'}
                              className="sm:col-span-2"
                              preserveWhitespace
                          />
                        </div>
                      )}
                    </form.Subscribe>
                  </div>
                </div>
              </FieldGroup>
            </div>
          </section>

          <div className="mt-8 hidden border-t border-border/70 pt-6 xl:flex xl:justify-end">
            <div className="flex items-center gap-3">
              <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => void router.navigate({ to: '/clients' })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Create Client
              </Button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => void router.navigate({ to: '/clients' })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Create Client
            </Button>
          </div>
        </div>
      </form>

      <ConfirmCreateClientDialog
          open={isConfirmationOpen}
          onOpenChange={handleConfirmationOpenChange}
          isPending={isPending}
          onConfirm={handleConfirmCreate}
      />
    </>
  );
}

interface ConfirmCreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void | Promise<void>;
}

function ConfirmCreateClientDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: ConfirmCreateClientDialogProps) {
  return (
    <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Create Client"
        description="Please confirm that you want to create this client."
        className="sm:max-w-md"
        footer={(
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isPending} className="gap-2">
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Create Client
          </Button>
        </>
      )}
    >
      <p className="text-sm text-muted-foreground">
        You can review and update the client details later from the client profile page.
      </p>
    </Modal>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function SummaryField({
  label,
  value,
  className,
  preserveWhitespace = false,
}: {
  label: string;
  value: string;
  className?: string;
  preserveWhitespace?: boolean;
}) {
  return (
    <div className={className ? `space-y-1 ${className}` : 'space-y-1'}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className={preserveWhitespace ? 'text-sm font-medium whitespace-pre-wrap text-foreground' : 'text-sm font-medium text-foreground'}>
        {value}
      </p>
    </div>
  );
}
