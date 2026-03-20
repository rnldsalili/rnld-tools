import * as React from 'react';

import { cn } from '@workspace/ui/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerAdornment?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  headerAdornment,
  children,
  footer,
  className,
  contentClassName,
  footerClassName,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          className={cn(
          'flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl border border-border/80 bg-background/95 p-0 shadow-xl shadow-black/10 supports-backdrop-filter:bg-background/92',
          className,
        )}
      >
        <DialogHeader className="shrink-0 gap-0 bg-gradient-to-b from-muted/35 via-muted/18 to-background px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold tracking-tight text-foreground">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 max-w-2xl text-xs/relaxed text-muted-foreground">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            {headerAdornment ? (
              <div className="flex shrink-0 items-center">
                {headerAdornment}
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div
            className="h-px shrink-0 bg-border/90 shadow-[0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]"
            aria-hidden="true"
        />

        <div
            className={cn(
            'flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/[0.08] px-4 py-4 sm:px-5',
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <DialogFooter
              className={cn(
              'shrink-0 border-t border-border/80 bg-gradient-to-b from-muted/[0.08] to-muted/[0.16] px-4 py-3 sm:px-5',
              footerClassName,
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { Modal };
