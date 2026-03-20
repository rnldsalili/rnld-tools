import * as React from 'react';
import { cn } from '@workspace/ui/lib/utils';

function SectionCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-sm shadow-black/[0.03]',
        className,
      )}
        {...props}
    />
  );
}

function SectionCardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn(
        'flex min-h-11 items-center border-b border-border/80 bg-gradient-to-b from-muted/30 via-muted/14 to-background px-4 py-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]',
        className,
      )}
        {...props}
    />
  );
}

function SectionCardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn('bg-gradient-to-b from-background to-muted/[0.06] px-4 py-3', className)}
        {...props}
    />
  );
}

function SectionCardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn(
        'border-t border-border/80 bg-gradient-to-b from-muted/[0.08] to-muted/[0.16] px-4 py-3',
        className,
      )}
        {...props}
    />
  );
}

export { SectionCard, SectionCardHeader, SectionCardContent, SectionCardFooter };
