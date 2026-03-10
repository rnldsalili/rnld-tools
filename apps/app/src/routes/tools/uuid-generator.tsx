import { createFileRoute } from '@tanstack/react-router';
import { HashIcon } from 'lucide-react';

export const Route = createFileRoute('/tools/uuid-generator')({
  component: UuidGeneratorPage,
});

function UuidGeneratorPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center justify-center size-12 rounded-full bg-accent mb-6">
        <HashIcon className="size-5 text-accent-foreground" />
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Tools
      </p>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">
        UUID Generator
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xs leading-relaxed text-sm">
        Generate universally unique identifiers. Coming soon.
      </p>
    </div>
  );
}
