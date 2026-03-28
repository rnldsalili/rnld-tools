import { Link, createFileRoute } from '@tanstack/react-router';
import { CLIENTS_LIMIT } from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { Button, DataTable, Input, Pagination } from '@workspace/ui';
import { format } from 'date-fns';
import { PlusIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ClientListItem } from '@/app/hooks/use-client';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useClients } from '@/app/hooks/use-client';

export const Route = createFileRoute('/_authenticated/(clients)/clients/')({
  head: () => ({ meta: [{ title: 'RTools - Clients' }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput);

  const { data, isLoading } = useClients({
    search: debouncedSearch,
    page,
    limit: CLIENTS_LIMIT,
  });

  const clients = data?.data.clients ?? [];
  const totalPages = data?.data.pagination.totalPages ?? 1;
  const canViewClients = useCan(PermissionModule.CLIENTS, PermissionAction.VIEW);

  if (!canViewClients) {
    return (
      <UnauthorizedState
          title="Clients Restricted"
          description="You do not have permission to view clients."
      />
    );
  }

  const columns: Array<ColumnDef<ClientListItem>> = [
    {
      accessorKey: 'name',
      header: 'Client',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ClientStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ?? '—',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email ?? '—',
    },
    {
      id: 'loans',
      header: 'Loans',
      cell: ({ row }) => row.original._count.loans,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => format(new Date(row.original.updatedAt), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <Link
              to="/clients/$clientId"
              params={{ clientId: row.original.id }}
              className="font-medium text-foreground transition-colors hover:text-primary"
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(event.target.value);
    setPage(1);
  }

  return (
    <AuthenticatedListPageShell
        icon={UsersIcon}
        title="Clients"
        description="Manage the client records used across loan creation and documents."
        action={(
        <Can I={PermissionAction.CREATE} a={PermissionModule.CLIENTS}>
          <Button asChild className="gap-1.5">
            <Link to="/clients/new">
              <PlusIcon className="size-3.5" />
              New Client
            </Link>
          </Button>
        </Can>
      )}
        controls={(
        <div className="flex items-center gap-3">
          <Input
              placeholder="Search clients..."
              value={searchInput}
              onChange={handleSearchChange}
              className="max-w-sm bg-background"
          />
        </div>
      )}
    >
      <DataTable
          columns={columns}
          data={clients}
          isLoading={isLoading}
          variant="embedded"
          footer={(
          <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={isLoading}
          />
        )}
      />
    </AuthenticatedListPageShell>
  );
}
