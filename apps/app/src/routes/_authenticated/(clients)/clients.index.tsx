import { Link, createFileRoute } from '@tanstack/react-router';
import { CLIENTS_LIMIT } from '@workspace/constants';
import { Button, DataTable, Input, Pagination } from '@workspace/ui';
import { format } from 'date-fns';
import { PlusIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ClientListItem } from '@/app/hooks/use-client';
import { CreateClientDialog } from '@/app/components/clients/create-client-dialog';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { useDebounce } from '@/app/hooks/use-debounce';
import {  useClients } from '@/app/hooks/use-client';

export const Route = createFileRoute('/_authenticated/(clients)/clients/')({
  head: () => ({ meta: [{ title: 'RTools - Clients' }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput);

  const { data, isLoading } = useClients({
    search: debouncedSearch,
    page,
    limit: CLIENTS_LIMIT,
  });

  const clients = data?.data.clients ?? [];
  const totalPages = data?.data.pagination.totalPages ?? 1;

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
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersIcon className="size-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Clients</h1>
              <p className="text-sm text-muted-foreground">
                Manage the client records used across loan creation and documents.
              </p>
            </div>
          </div>
          <Button className="gap-1.5" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="size-3.5" />
            New Client
          </Button>
        </div>

        <Input
            placeholder="Search clients..."
            value={searchInput}
            onChange={handleSearchChange}
            className="max-w-xs"
        />

        <DataTable
            columns={columns}
            data={clients}
            isLoading={isLoading}
            footer={(
            <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                isLoading={isLoading}
            />
          )}
        />
      </div>

      <CreateClientDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  );
}
