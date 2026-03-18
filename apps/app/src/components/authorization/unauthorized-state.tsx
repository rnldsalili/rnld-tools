import { Link } from '@tanstack/react-router';
import { ShieldAlertIcon } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui';

export function UnauthorizedState({
  title = 'Access Restricted',
  description = 'You do not have permission to view this page.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <ShieldAlertIcon className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
