import { Badge, cn } from '@workspace/ui';
import { INSTALLMENT_STATUS_LABELS, InstallmentStatus } from '@workspace/constants';

const STATUS_STYLES: Record<string, string> = {
  [InstallmentStatus.PENDING]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  [InstallmentStatus.PAID]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  [InstallmentStatus.OVERDUE]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface InstallmentStatusBadgeProps {
  status: string;
}

export function InstallmentStatusBadge({ status }: InstallmentStatusBadgeProps) {
  return (
    <Badge className={cn('border-0 font-medium', STATUS_STYLES[status])}>
      {INSTALLMENT_STATUS_LABELS[status as InstallmentStatus] ?? status}
    </Badge>
  );
}
