import { Link, createFileRoute } from '@tanstack/react-router';
import { ShieldCheckIcon } from 'lucide-react';
import { Badge, DataTable } from '@workspace/ui';
import { PermissionAction, PermissionModule, getPermissionModuleLabel } from '@workspace/permissions';
import type { ColumnDef } from '@tanstack/react-table';
import type { RoleItem } from '@/app/hooks/use-roles';
import { PermissionGuard } from '@/app/components/authorization/permission-guard';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useRoles } from '@/app/hooks/use-roles';

export const Route = createFileRoute('/_authenticated/settings/roles/')({
  head: () => ({ meta: [{ title: 'RTools - Roles' }] }),
  component: RolesListPage,
});

function RolesListPage() {
  const { data, isLoading } = useRoles();
  const roles = data?.data.roles ?? [];

  const columns: Array<ColumnDef<RoleItem>> = [
    {
      accessorKey: 'name',
      header: 'Role',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description || 'No description available.'}
        </span>
      ),
    },
    {
      accessorKey: 'userCount',
      header: 'Users',
      cell: ({ row }) => row.original.userCount ?? 0,
    },
    {
      id: 'access',
      header: 'Access',
      cell: ({ row }) => (
        row.original.hasFullAccess ? (
          <Badge>Full Access</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">
            {row.original.permissions.length > 0
              ? row.original.permissions.map((permission) => getPermissionModuleLabel(permission.module)).join(', ')
              : 'No access'}
          </span>
        )
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <Link
              to="/settings/roles/$roleSlug"
              params={{ roleSlug: row.original.slug }}
              className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard module={PermissionModule.ROLES} action={PermissionAction.VIEW}>
      <AuthenticatedListPageShell
          icon={ShieldCheckIcon}
          title="Roles"
          description="Review the built-in roles and open a role to inspect or update its permission matrix."
      >
        <DataTable columns={columns} data={roles} isLoading={isLoading} variant="embedded" />
      </AuthenticatedListPageShell>
    </PermissionGuard>
  );
}
