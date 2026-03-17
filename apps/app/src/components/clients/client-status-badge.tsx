import { Badge } from '@workspace/ui';
import { CLIENT_STATUS_LABELS, ClientStatus } from '@workspace/constants';

interface ClientStatusBadgeProps {
  status: ClientStatus;
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  if (status === ClientStatus.ENABLED) {
    return <Badge className="bg-green-600 text-white hover:bg-green-600">{CLIENT_STATUS_LABELS[status]}</Badge>;
  }

  return <Badge variant="secondary">{CLIENT_STATUS_LABELS[status]}</Badge>;
}
