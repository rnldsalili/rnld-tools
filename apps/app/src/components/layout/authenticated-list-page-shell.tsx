import { cn } from '@workspace/ui';
import type * as React from 'react';

interface AuthenticatedListPageShellProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AuthenticatedListPageShell({
  icon: Icon,
  title,
  description,
  action,
  controls,
  children,
  className,
}: AuthenticatedListPageShellProps) {
  return (
    <div className="min-h-full bg-muted/[0.18]">
      <div className={cn('mx-auto flex w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-5', className)}>
        <section className="overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-sm shadow-black/[0.03]">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary shadow-sm shadow-primary/5">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>

            {action ? (
              <div className="flex shrink-0 items-center justify-start lg:justify-end">
                {action}
              </div>
            ) : null}
          </div>

          {controls ? (
            <div className="border-t border-border/70 bg-muted/15 px-4 py-3 sm:px-5">
              {controls}
            </div>
          ) : null}

          <div className={cn('border-t border-border/70', !controls && 'border-t-0')}>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
