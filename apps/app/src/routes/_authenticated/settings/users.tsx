import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { useDeferredValue, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  Field,
  FieldLabel,
  Input,
  Modal,
  Pagination,
} from '@workspace/ui';
import {
  PermissionAction,
  PermissionModule,
  SystemRoleSlug,
  hasSuperAdminRole,
} from '@workspace/permissions';
import { Can } from '@workspace/permissions/react';
import { PlusIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import type { RoleItem } from '@/app/hooks/use-roles';
import type { UserListItem } from '@/app/hooks/use-users';
import { PermissionGuard } from '@/app/components/authorization/permission-guard';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import { useRoles } from '@/app/hooks/use-roles';
import { useCreateUser, useUpdateUser, useUsers } from '@/app/hooks/use-users';

const USERS_PAGE_LIMIT = 10;
const EDIT_USER_FORM_ID = 'edit-user-form';
const CREATE_USER_FORM_ID = 'create-user-form';

export const Route = createFileRoute('/_authenticated/settings/users')({
  head: () => ({ meta: [{ title: 'RTools - Users' }] }),
  staticData: { title: 'Users' },
  component: UsersSettingsPage,
});

function UsersSettingsPage() {
  const { authorization } = useAppAuthorization();
  const currentUserHasSuperAdminRole = authorization
    ? hasSuperAdminRole(authorization.roles)
    : false;
  const { data: rolesData } = useRoles();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userEditing, setUserEditing] = useState<UserListItem | null>(null);
  const deferredSearch = useDeferredValue(searchInput);
  const { data, isLoading } = useUsers({
    search: deferredSearch,
    page,
    limit: USERS_PAGE_LIMIT,
  });
  const { mutateAsync: createUser, isPending: isCreatePending } = useCreateUser();
  const { mutateAsync: updateUser, isPending: isUpdatePending } = useUpdateUser();

  const users = data?.data.users ?? [];
  const totalPages = data?.data.pagination.totalPages ?? 1;
  const assignableRoles = rolesData?.data.roles
    ? currentUserHasSuperAdminRole
      ? rolesData.data.roles
      : rolesData.data.roles.filter((role: RoleItem) => role.slug !== SystemRoleSlug.SUPER_ADMIN)
    : [];

  const columns: Array<ColumnDef<UserListItem>> = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length > 0 ? (
            row.original.roles.map((role: UserListItem['roles'][number]) => (
              <Badge key={role.slug} variant="secondary">
                {role.name}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No roles assigned</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => format(new Date(row.original.updatedAt), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const targetHasSuperAdminRole = row.original.roles.some((role: UserListItem['roles'][number]) => (
          role.slug === SystemRoleSlug.SUPER_ADMIN
        ));

        if (targetHasSuperAdminRole && !currentUserHasSuperAdminRole) {
          return null;
        }

        return (
          <Can I={PermissionAction.ASSIGN_ROLES} a={PermissionModule.USERS}>
            <div className="flex items-center justify-end text-sm">
              <button
                  type="button"
                  className="font-medium text-foreground transition-colors hover:text-primary"
                  onClick={() => setUserEditing(row.original)}
              >
                Edit
              </button>
            </div>
          </Can>
        );
      },
    },
  ];

  async function handleCreateUser(input: {
    name: string;
    email: string;
    roleSlugs: Array<string>;
  }) {
    try {
      await createUser(input);
      setIsCreateModalOpen(false);
      toast.success('User created. The temporary password has been emailed.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function handleSaveUser(input: {
    name: string;
    roleSlugs: Array<string>;
  }) {
    if (!userEditing) {
      return;
    }

    try {
      await updateUser({
        userId: userEditing.id,
        body: input,
      });
      setUserEditing(null);
      toast.success('User updated.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <>
      <PermissionGuard module={PermissionModule.USERS} action={PermissionAction.VIEW}>
        <AuthenticatedListPageShell
            icon={UsersIcon}
            title="Users"
            description="Create users and manage the roles assigned to each account."
            action={(
            <Can I={PermissionAction.CREATE} a={PermissionModule.USERS}>
              <Button
                  type="button"
                  className="gap-2"
                  onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusIcon className="size-3.5" />
                New User
              </Button>
            </Can>
          )}
            controls={(
            <Input
                placeholder="Search users..."
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                className="max-w-sm bg-background"
            />
          )}
        >
          <DataTable
              columns={columns}
              data={users}
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
      </PermissionGuard>

      <CreateUserModal
          open={isCreateModalOpen}
          roles={assignableRoles}
          isPending={isCreatePending}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateUser}
      />

      <EditUserModal
          key={userEditing?.id ?? 'user-roles'}
          open={Boolean(userEditing)}
          user={userEditing}
          roles={assignableRoles}
          isPending={isUpdatePending}
          onOpenChange={(open) => {
            if (!open) {
              setUserEditing(null);
            }
          }}
          onSubmit={handleSaveUser}
      />
    </>
  );
}

function CreateUserModal({
  open,
  roles,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  roles: Array<RoleItem>;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    name: string;
    email: string;
    roleSlugs: Array<string>;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<Array<string>>([]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      email: email.trim(),
      roleSlugs: selectedRoleSlugs,
    });
  }

  function handleModalOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setName('');
      setEmail('');
      setSelectedRoleSlugs([]);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Modal
        open={open}
        onOpenChange={handleModalOpenChange}
        title="Create User"
        className="sm:max-w-xl"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => handleModalOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
                type="submit"
                form={CREATE_USER_FORM_ID}
                disabled={isPending || name.trim().length === 0 || email.trim().length === 0}
            >
              Create User
            </Button>
          </div>
        )}
    >
      <form id={CREATE_USER_FORM_ID} className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-sm text-muted-foreground">
          A temporary password will be generated automatically and sent using the configured notification email.
        </p>

        <Field>
          <FieldLabel htmlFor="create-user-name">Name</FieldLabel>
          <Input
              id="create-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Doe"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="create-user-email">Email</FieldLabel>
          <Input
              id="create-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jane@example.com"
          />
        </Field>

        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">Roles</h2>
            <p className="text-sm text-muted-foreground">
              Select one or more roles for the new user.
            </p>
          </div>

          {roles.map((role) => (
            <label
                key={role.slug}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                    checked={selectedRoleSlugs.includes(role.slug)}
                    onCheckedChange={(checked) => {
                      setSelectedRoleSlugs((previousRoleSlugs) => (
                        checked
                          ? [...previousRoleSlugs, role.slug]
                          : previousRoleSlugs.filter((roleSlug) => roleSlug !== role.slug)
                      ));
                    }}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {role.description || 'No description'}
                  </span>
                </div>
              </div>

              {role.isSystem ? <Badge variant="secondary">System</Badge> : null}
            </label>
          ))}
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  open,
  user,
  roles,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  user: UserListItem | null;
  roles: Array<RoleItem>;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { name: string; roleSlugs: Array<string> }) => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<Array<string>>(
    user?.roles.map((role: UserListItem['roles'][number]) => role.slug) ?? [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      roleSlugs: selectedRoleSlugs,
    });
  }

  return (
    <Modal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setName(user?.name ?? '');
            setSelectedRoleSlugs(user?.roles.map((role: UserListItem['roles'][number]) => role.slug) ?? []);
          }

          onOpenChange(nextOpen);
        }}
        title={user ? `Edit ${user.name}` : 'Edit User'}
        className="sm:max-w-xl"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form={EDIT_USER_FORM_ID} disabled={isPending || name.trim().length === 0}>
              Save
            </Button>
          </div>
        )}
    >
      <form id={EDIT_USER_FORM_ID} className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Field>
          <FieldLabel htmlFor="edit-user-name">Name</FieldLabel>
          <Input
              id="edit-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Doe"
          />
        </Field>

        {user ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Update the user name and assigned roles. Permissions are combined across assigned roles.
        </p>

        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <label
                key={role.slug}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                    checked={selectedRoleSlugs.includes(role.slug)}
                    onCheckedChange={(checked) => {
                      setSelectedRoleSlugs((previousRoleSlugs) => (
                        checked
                          ? [...previousRoleSlugs, role.slug]
                          : previousRoleSlugs.filter((roleSlug) => roleSlug !== role.slug)
                      ));
                    }}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {role.description || 'No description'}
                  </span>
                </div>
              </div>

              {role.isSystem ? <Badge variant="secondary">System</Badge> : null}
            </label>
          ))}
        </div>
      </form>
    </Modal>
  );
}
