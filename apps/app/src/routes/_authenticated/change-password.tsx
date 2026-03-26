import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui';
import { useEffect } from 'react';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { PasswordUpdateForm } from '@/app/components/account/password-update-form';
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
  const mustChangePassword = authorization?.user.mustChangePassword ?? false;
  const defaultDestination = getDefaultAuthenticatedDestination(authorization);

  useEffect(() => {
    if (!mustChangePassword) {
      void router.navigate({ to: defaultDestination, replace: true });
    }
  }, [defaultDestination, mustChangePassword, router]);

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
          <PasswordUpdateForm
              currentPasswordLabel="Temporary Password"
              formIdPrefix="forced-password-change"
              isPending={isPending}
              onSubmit={changeMyPassword}
              onSuccess={async () => {
                await router.navigate({ to: defaultDestination, replace: true });
              }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
