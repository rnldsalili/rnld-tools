import { createFileRoute } from '@tanstack/react-router';
import { UsersIcon } from 'lucide-react';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { CreateClientForm } from '@/app/components/clients/create-client-form';
import { AuthenticatedDetailPageShell } from '@/app/components/layout/authenticated-detail-page-shell';

export const Route = createFileRoute('/_authenticated/(clients)/clients/new')({
  head: () => ({ meta: [{ title: 'RTools - New Client' }] }),
  staticData: { title: 'New Client' },
  component: NewClientPage,
});

function NewClientPage() {
  const canCreateClients = useCan(PermissionModule.CLIENTS, PermissionAction.CREATE);

  if (!canCreateClients) {
    return (
      <UnauthorizedState
          title="Client Creation Restricted"
          description="You do not have permission to create new clients."
      />
    );
  }

  return (
    <AuthenticatedDetailPageShell
        icon={UsersIcon}
        title="New Client"
        description="Create a reusable client profile in a dedicated page that is easier to review before saving."
        backgroundClassName="bg-background"
        surface="plain"
        showHeader={false}
    >
      <CreateClientForm />
    </AuthenticatedDetailPageShell>
  );
}
