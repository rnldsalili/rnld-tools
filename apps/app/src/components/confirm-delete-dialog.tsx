import { Loader2Icon } from 'lucide-react';
import {
  Button,
  Modal,
} from '@workspace/ui';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description="This action cannot be undone."
        className="sm:max-w-md"
        footer={(
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
              variant="destructive"
              onClick={() => void onConfirm()}
              disabled={isPending}
              className="gap-2"
          >
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  );
}
