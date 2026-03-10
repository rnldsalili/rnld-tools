import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({ component: DashboardPage });

function DashboardPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Dashboard
      </p>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">
        Welcome back
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xs leading-relaxed text-sm">
        You are signed in. Build your dashboard here.
      </p>
    </div>
  );
}
