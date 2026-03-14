import * as React from 'react';

import { cn } from '@workspace/ui/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Separator } from '@workspace/ui/components/separator';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function Modal({ open, onOpenChange, title, children, footer, className }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          className={cn(
          'flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden',
          className,
        )}
      >
        <DialogHeader className="shrink-0 px-4 pt-4 pb-3">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {footer && (
          <>
            <Separator />
            <DialogFooter className="shrink-0 px-4 py-3">
              {footer}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { Modal };
