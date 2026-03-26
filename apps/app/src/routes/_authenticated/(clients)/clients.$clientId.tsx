import { Link, createFileRoute } from '@tanstack/react-router';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { Badge, Button, DataTable, SectionCard, SectionCardContent, SectionCardHeader } from '@workspace/ui';
import { format } from 'date-fns';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ClientLoanListItem } from '@/app/hooks/use-client';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { EditClientDialog } from '@/app/components/clients/edit-client-dialog';
import { useClient, useClientLoans } from '@/app/hooks/use-client';
import { formatCurrency } from '@/app/lib/format';

export const Route = createFileRoute('/_authenticated/(clients)/clients/$clientId')({
  head: () => ({ meta: [{ title: 'RTools - Client Detail' }] }),
  staticData: { title: 'Client Detail' },
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const canViewClients = useCan(PermissionModule.CLIENTS, PermissionAction.VIEW);
  const canViewLoans = useCan(PermissionModule.LOANS, PermissionAction.VIEW);
  const { data, isLoading } = useClient({ clientId });
  const client = data?.data.client;
  const { data: clientLoansData, isLoading: isClientLoansLoading } = useClientLoans({
    clientId,
    enabled: canViewLoans,
  });
  const clientLoans = clientLoansData?.data.loans ?? [];

  if (!canViewClients) {
    return (
      <UnauthorizedState
          title="Client Access Restricted"
          description="You do not have permission to view client details."
      />
    );
  }

  const loanColumns: Array<ColumnDef<ClientLoanListItem>> = [
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.original.description?.trim() || '—',
    },
    {
      accessorKey: 'interestRate',
      header: 'Interest Rate',
      cell: ({ row }) =>
        row.original.interestRate != null ? `${row.original.interestRate}%` : '—',
    },
    {
      id: 'installments',
      header: 'Installments',
      cell: ({ row }) => (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {row.original.paidInstallmentsCount}/{row.original._count.installments}
        </span>
      ),
    },
    {
      accessorKey: 'loanDate',
      header: 'Loan Date',
      cell: ({ row }) => format(new Date(row.original.loanDate), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <Link
              to="/loans/$loanId"
              params={{ loanId: row.original.id }}
              className="font-medium text-foreground transition-colors hover:text-primary"
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <SectionCard>
        <SectionCardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Client Details</span>
          {client ? (
            <Can I={PermissionAction.UPDATE} a={PermissionModule.CLIENTS}>
              <Button variant="ghost" className="gap-1.5" onClick={() => setIsEditOpen(true)}>
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

      {canViewLoans ? (
        <div className="mt-4">
          <DataTable
              columns={loanColumns}
              data={clientLoans}
              isLoading={isClientLoansLoading}
              toolbar={(
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Loans</span>
                    {!isClientLoansLoading ? (
                      <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                        {clientLoans.length}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              )}
          />
        </div>
      ) : null}

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
