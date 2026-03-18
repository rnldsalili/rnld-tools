import * as React from 'react';
import { cn } from '@workspace/ui/lib/utils';

function SectionCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn('rounded-md border border-border bg-card overflow-hidden', className)}
        {...props}
    />
  );
}

function SectionCardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn('flex min-h-11 items-center border-b border-border px-4 py-3', className)}
        {...props}
    />
  );
}

function SectionCardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn('px-4 py-3', className)}
        {...props}
    />
  );
}

function SectionCardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
        className={cn('border-t border-border px-4 py-3', className)}
        {...props}
    />
  );
}

export { SectionCard, SectionCardHeader, SectionCardContent, SectionCardFooter };
