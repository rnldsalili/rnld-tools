import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ShieldAlertIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { getDefaultAuthenticatedDestination } from '@/app/lib/default-authenticated-route';

export function UnauthorizedState({
  title = 'Access Restricted',
  description = 'You do not have permission to view this page.',
}: {
  title?: string;
  description?: string;
}) {
  const { authorization } = useAppAuthorization();
  const defaultDestination = getDefaultAuthenticatedDestination(authorization);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlertIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Restricted
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-base">You cannot access this section.</CardTitle>
            <CardDescription className="max-w-lg text-sm leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Status
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Your account is signed in, but this route is permission-gated.
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Next Step
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Return to your first available workspace section or ask an administrator to review your role.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Permissions are enforced per section to protect records and settings.
              </p>
              <Button asChild className="gap-1.5 self-start">
                <Link to={defaultDestination}>
                  <ArrowLeftIcon className="size-4" />
                  Back to Workspace
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
