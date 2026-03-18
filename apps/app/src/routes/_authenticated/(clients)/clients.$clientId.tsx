import { createFileRoute } from '@tanstack/react-router';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { Button, SectionCard, SectionCardContent, SectionCardHeader } from '@workspace/ui';
import { format } from 'date-fns';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { EditClientDialog } from '@/app/components/clients/edit-client-dialog';
import { useClient } from '@/app/hooks/use-client';

export const Route = createFileRoute('/_authenticated/(clients)/clients/$clientId')({
  head: () => ({ meta: [{ title: 'RTools - Client Detail' }] }),
  staticData: { title: 'Client Detail' },
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { data, isLoading } = useClient({ clientId });

  const client = data?.data.client;
  const canViewClients = useCan(PermissionModule.CLIENTS, PermissionAction.VIEW);

  if (!canViewClients) {
    return (
      <UnauthorizedState
          title="Client Access Restricted"
          description="You do not have permission to view client details."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <SectionCard>
        <SectionCardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Client Details</span>
          {client ? (
            <Can I={PermissionAction.UPDATE} a={PermissionModule.CLIENTS}>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setIsEditOpen(true)}>
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            </Can>
          ) : null}
        </SectionCardHeader>
        <SectionCardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-4 w-full animate-pulse rounded-sm bg-muted" />
              ))}
            </div>
          ) : client ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">{client.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {client._count.loans} linked loan{client._count.loans === 1 ? '' : 's'}
                  </p>
                </div>
                <ClientStatusBadge status={client.status} />
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <ClientField label="Phone" value={client.phone ?? '—'} />
                <ClientField label="Email" value={client.email ?? '—'} />
                <ClientField label="Created" value={format(new Date(client.createdAt), 'MMM d, yyyy')} />
                <ClientField label="Updated" value={format(new Date(client.updatedAt), 'MMM d, yyyy')} />
              </div>

              <div className="border-t border-border pt-4">
                <ClientField label="Address" value={client.address ?? '—'} />
              </div>
            </div>
          ) : null}
        </SectionCardContent>
      </SectionCard>

      {isEditOpen && client ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.CLIENTS}>
        <EditClientDialog client={client} onClose={() => setIsEditOpen(false)} />
        </Can>
      ) : null}
    </div>
  );
}

function ClientField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all whitespace-pre-wrap">{value}</span>
    </div>
  );
}
