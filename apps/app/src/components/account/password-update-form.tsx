import { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  PasswordInput,
} from '@workspace/ui';

export interface PasswordUpdateInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordUpdateFormProps {
  currentPasswordLabel?: string;
  formIdPrefix?: string;
  isPending: boolean;
  onSubmit: (input: PasswordUpdateInput) => Promise<unknown>;
  onSuccess?: () => Promise<void> | void;
  pendingLabel?: string;
  submitLabel?: string;
  successMessage?: string;
}

export function PasswordUpdateForm({
  currentPasswordLabel = 'Current Password',
  formIdPrefix = 'password-update',
  isPending,
  onSubmit,
  onSuccess,
  pendingLabel = 'Updating Password...',
  submitLabel = 'Update Password',
  successMessage = 'Password updated.',
}: PasswordUpdateFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      const mismatchMessage = 'Passwords do not match.';
      setError(mismatchMessage);
      toast.error(mismatchMessage);
      return;
    }

    try {
      await onSubmit({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(successMessage);
      await onSuccess?.();
    } catch (passwordUpdateError) {
      const message = passwordUpdateError instanceof Error
        ? passwordUpdateError.message
        : 'Failed to update password.';
      setError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!error && currentPassword.trim().length === 0 ? true : undefined}>
          <FieldLabel htmlFor={`${formIdPrefix}-current-password`}>{currentPasswordLabel}</FieldLabel>
          <PasswordInput
              id={`${formIdPrefix}-current-password`}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              disabled={isPending}
          />
        </Field>

        <Field data-invalid={!!error && newPassword.trim().length === 0 ? true : undefined}>
          <FieldLabel htmlFor={`${formIdPrefix}-new-password`}>New Password</FieldLabel>
          <PasswordInput
              id={`${formIdPrefix}-new-password`}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              disabled={isPending}
          />
        </Field>

        <Field data-invalid={!!error && confirmPassword.trim().length === 0 ? true : undefined}>
          <FieldLabel htmlFor={`${formIdPrefix}-confirm-password`}>Confirm Password</FieldLabel>
          <PasswordInput
              id={`${formIdPrefix}-confirm-password`}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              disabled={isPending}
          />
        </Field>
      </FieldGroup>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button
          type="submit"
          disabled={
            isPending
            || currentPassword.trim().length === 0
            || newPassword.trim().length === 0
            || confirmPassword.trim().length === 0
          }
      >
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
