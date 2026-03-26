import { useSession } from '@workspace/auth-client';
import { createFileRoute } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import { KeyRoundIcon, MailIcon, UserRoundIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PasswordUpdateInput } from '@/app/components/account/password-update-form';
import { PasswordUpdateForm } from '@/app/components/account/password-update-form';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { AuthenticatedDetailPageShell } from '@/app/components/layout/authenticated-detail-page-shell';
import {
  useChangeMyPassword,
  useUpdateCurrentUser,
} from '@/app/hooks/use-users';

export const Route = createFileRoute('/_authenticated/profile')({
  head: () => ({ meta: [{ title: 'RTools - Profile' }] }),
  staticData: { title: 'Profile' },
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session } = useSession();
  const { authorization } = useAppAuthorization();
  const { mutateAsync: updateCurrentUser, isPending: isProfilePending } = useUpdateCurrentUser();
  const { mutateAsync: changeMyPassword, isPending: isPasswordPending } = useChangeMyPassword();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const authorizationUser = authorization?.user;
  const userRoles = authorization?.roles ?? [];
  const currentName = authorizationUser?.name ?? session?.user.name ?? '';
  const currentEmail = authorizationUser?.email ?? session?.user.email ?? '';
  const trimmedName = name.trim();
  const isNameChanged = trimmedName !== currentName.trim();

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);

    if (trimmedName.length === 0) {
      const validationMessage = 'Name is required.';
      setNameError(validationMessage);
      toast.error(validationMessage);
      return;
    }

    try {
      await updateCurrentUser({ name: trimmedName });
      setName(trimmedName);
      toast.success('Profile updated.');
    } catch (profileUpdateError) {
      const message = profileUpdateError instanceof Error
        ? profileUpdateError.message
        : 'Failed to update profile.';
      setNameError(message);
      toast.error(message);
    }
  }

  async function handlePasswordSubmit(input: PasswordUpdateInput) {
    await changeMyPassword(input);
  }

  return (
    <AuthenticatedDetailPageShell
        icon={UserRoundIcon}
        title="Profile"
        description="Update your account name and password. Email changes are intentionally disabled."
        meta={userRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role) => (
              <Badge key={role.slug} variant="outline" className="rounded-full bg-background/80 px-3 py-1">
                {role.name}
              </Badge>
            ))}
          </div>
        ) : undefined}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SectionCard className="h-full border-border/70 bg-background/90">
          <SectionCardHeader className="flex-col items-start gap-3 border-b border-border/70 pb-4">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <MailIcon className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Profile Details</h2>
              <p className="text-sm text-muted-foreground">
                Change the display name used throughout the authenticated workspace.
              </p>
            </div>
          </SectionCardHeader>
          <SectionCardContent className="pt-5">
            <form onSubmit={(event) => void handleProfileSubmit(event)} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={!!nameError && trimmedName.length === 0 ? true : undefined}>
                  <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                  <Input
                      id="profile-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        if (nameError) {
                          setNameError(null);
                        }
                      }}
                      disabled={isProfilePending}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                  <Input
                      id="profile-email"
                      value={currentEmail}
                      readOnly
                      className="bg-muted/35 text-muted-foreground"
                  />
                  <FieldDescription>
                    Email addresses are managed separately and cannot be changed from this page.
                  </FieldDescription>
                </Field>
              </FieldGroup>

              {nameError ? <FieldError>{nameError}</FieldError> : null}

              <Button
                  type="submit"
                  className="w-full sm:w-fit"
                  disabled={isProfilePending || trimmedName.length === 0 || !isNameChanged}
              >
                {isProfilePending ? 'Saving Profile...' : 'Save Profile'}
              </Button>
            </form>
          </SectionCardContent>
        </SectionCard>

        <SectionCard className="h-full border-border/70 bg-background/90">
          <SectionCardHeader className="flex-col items-start gap-3 border-b border-border/70 pb-4">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Password</h2>
              <p className="text-sm text-muted-foreground">
                Confirm your current password before choosing a new one for this account.
              </p>
            </div>
          </SectionCardHeader>
          <SectionCardContent className="pt-5">
            <PasswordUpdateForm
                formIdPrefix="profile-password"
                isPending={isPasswordPending}
                onSubmit={handlePasswordSubmit}
                submitLabel="Update Password"
                pendingLabel="Updating Password..."
                successMessage="Password updated."
            />
          </SectionCardContent>
        </SectionCard>
      </div>
    </AuthenticatedDetailPageShell>
  );
}
