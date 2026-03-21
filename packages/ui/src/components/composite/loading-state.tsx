import { Loader2Icon } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

interface LoadingStateProps {
  className?: string;
}

function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn('flex min-h-96 items-center justify-center px-4 py-8', className)}>
      <Loader2Icon className="size-9 animate-spin text-primary" />
    </div>
  );
}

export { LoadingState };
