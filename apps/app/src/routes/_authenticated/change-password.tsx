import { useEffect, useState } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  PasswordInput,
} from '@workspace/ui';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { useChangeMyPassword } from '@/app/hooks/use-users';
import { getDefaultAuthenticatedDestination } from '@/app/lib/default-authenticated-route';

export const Route = createFileRoute('/_authenticated/change-password')({
  ssr: false,
  head: () => ({ meta: [{ title: 'RTools - Change Password' }] }),
  staticData: { title: 'Change Password' },
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const router = useRouter();
  const { authorization } = useAppAuthorization();
  const { mutateAsync: changeMyPassword, isPending } = useChangeMyPassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mustChangePassword = authorization?.user.mustChangePassword ?? false;
  const defaultDestination = getDefaultAuthenticatedDestination(authorization);

  useEffect(() => {
    if (!mustChangePassword) {
      void router.navigate({ to: defaultDestination, replace: true });
    }
  }, [defaultDestination, mustChangePassword, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      const mismatchMessage = 'Passwords do not match.';
      setError(mismatchMessage);
      toast.error(mismatchMessage);
      return;
    }

    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
      });
      toast.success('Password updated.');
      await router.navigate({ to: defaultDestination, replace: true });
    } catch (changePasswordError) {
      const message = changePasswordError instanceof Error
        ? changePasswordError.message
        : 'Failed to update password.';
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Change Your Password</CardTitle>
          <CardDescription>
            Your temporary password must be replaced before you can access the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={!!error && !currentPassword ? true : undefined}>
                <FieldLabel htmlFor="current-password">Temporary Password</FieldLabel>
                <PasswordInput
                    id="current-password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    disabled={isPending}
                />
              </Field>

              <Field data-invalid={!!error && !newPassword ? true : undefined}>
                <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={isPending}
                />
              </Field>

              <Field data-invalid={!!error && !confirmPassword ? true : undefined}>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
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
              {isPending ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
