import { SectionCard, cn } from '@workspace/ui';
import type * as React from 'react';

interface AuthenticatedDetailPageShellProps {
  icon: React.ElementType;
  title: string;
  description: string;
  backAction?: React.ReactNode;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  backgroundClassName?: string;
  surface?: 'card' | 'plain';
  showHeader?: boolean;
}

export function AuthenticatedDetailPageShell({
  icon: Icon,
  title,
  description,
  backAction,
  action,
  meta,
  children,
  className,
  backgroundClassName,
  surface = 'card',
  showHeader = true,
}: AuthenticatedDetailPageShellProps) {
  const header = (
    <div className="flex flex-col gap-4 px-3 py-3 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
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

      {backAction || action ? (
        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {backAction}
          {action}
        </div>
      ) : null}
    </div>
  );

  if (surface === 'plain') {
    return (
      <div className={cn('min-h-full bg-muted/[0.18]', backgroundClassName)}>
        <div className={cn('mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-4 px-3 py-3 sm:px-6 sm:py-5', className)}>
          {showHeader ? header : null}
          {meta ? (
            <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-3 sm:px-5">
              {meta}
            </div>
          ) : null}
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-full bg-muted/[0.18]', backgroundClassName)}>
      <div className={cn('mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-3 py-3 sm:px-6 sm:py-5', className)}>
        <SectionCard>
          {showHeader ? header : null}

          {meta ? (
            <div className="border-t border-border/70 bg-muted/15 px-3 py-3 sm:px-5">
              {meta}
            </div>
          ) : null}

          <div className={cn('px-3 py-3 sm:px-5 sm:py-5', meta && 'border-t border-border/70')}>
            {children}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
