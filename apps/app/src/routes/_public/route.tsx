import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import { WrenchIcon } from 'lucide-react';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/95 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 w-fit select-none">
          <span className="flex items-center justify-center size-6 rounded-md bg-primary text-primary-foreground shrink-0">
            <WrenchIcon className="size-3.5" />
          </span>
          <span className="text-sm font-semibold text-foreground tracking-tight">RTools</span>
        </Link>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
