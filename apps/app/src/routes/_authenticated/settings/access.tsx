import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useDeferredValue, useState } from 'react';
import { z } from 'zod';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@workspace/ui';
import {
  PermissionAction,
  PermissionModule,
  getPermissionActions,
  isPermissionAction,
  isPermissionModule,
  isProtectedSystemRoleSlug,
  permissionCatalog,
  permissionModules,
} from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import type { RoleItem } from '@/app/hooks/use-roles';
import type { UserListItem } from '@/app/hooks/use-users';
import { PermissionGuard } from '@/app/components/authorization/permission-guard';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { ConfirmDeleteDialog } from '@/app/components/confirm-delete-dialog';
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from '@/app/hooks/use-roles';
import { useUpdateUserRoles, useUsers } from '@/app/hooks/use-users';

const ACCESS_TABS = ['roles', 'users'] as const;
const USERS_PAGE_LIMIT = 10;
const ROLE_FORM_ID = 'role-form';
const USER_ROLE_FORM_ID = 'user-role-form';

type AccessTab = typeof ACCESS_TABS[number];
type PermissionSelectionState = Record<PermissionModule, Array<PermissionAction>>;

export const Route = createFileRoute('/_authenticated/settings/access')({
  head: () => ({ meta: [{ title: 'RTools - Access Management' }] }),
  staticData: { title: 'Access' },
  validateSearch: z.object({
    tab: z.enum(ACCESS_TABS).optional(),
  }),
  component: AccessSettingsPage,
});

function AccessSettingsPage() {
  const router = useRouter();
  const { tab } = Route.useSearch();

  const canViewRoles = useCan(PermissionModule.ROLES, PermissionAction.VIEW);
  const canViewUsers = useCan(PermissionModule.USERS, PermissionAction.VIEW);

  if (!canViewRoles && !canViewUsers) {
    return (
      <UnauthorizedState
          title="Access Management Restricted"
          description="You do not have permission to manage roles or user assignments."
      />
    );
  }

  const allowedTabs = ACCESS_TABS.filter((accessTab) => (
    accessTab === 'roles' ? canViewRoles : canViewUsers
  ));
  const effectiveTab = allowedTabs.includes(tab ?? 'roles')
    ? (tab ?? allowedTabs[0])
    : allowedTabs[0];

  function handleTabChange(nextTab: string) {
    if (!allowedTabs.includes(nextTab as AccessTab)) {
      return;
    }

    void router.navigate({
      to: Route.to,
      search: (previousSearch) => ({
        ...previousSearch,
        tab: nextTab as AccessTab,
      }),
      replace: true,
    });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheckIcon className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Access Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage reusable roles and assign them to users across the system.
            </p>
          </div>
        </div>

        <Tabs value={effectiveTab} onValueChange={handleTabChange}>
          <TabsList>
            {canViewRoles ? <TabsTrigger value="roles">Roles</TabsTrigger> : null}
            {canViewUsers ? <TabsTrigger value="users">Users</TabsTrigger> : null}
          </TabsList>

          {canViewRoles ? (
            <TabsContent value="roles">
              <RolesSection />
            </TabsContent>
          ) : null}

          {canViewUsers ? (
            <TabsContent value="users">
              <UsersSection />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
}

export function RolesSection() {
  const { data, isLoading } = useRoles();
  const { mutateAsync: createRole, isPending: isCreatePending } = useCreateRole();
  const { mutateAsync: updateRole, isPending: isUpdatePending } = useUpdateRole();
  const { mutateAsync: deleteRole, isPending: isDeletePending } = useDeleteRole();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [roleEditing, setRoleEditing] = useState<RoleItem | null>(null);
  const [rolePendingDelete, setRolePendingDelete] = useState<RoleItem | null>(null);
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
      accessorKey: 'isSystem',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.isSystem ? 'secondary' : 'outline'}>
          {row.original.isSystem ? 'System' : 'Custom'}
        </Badge>
      ),
    },
    {
      accessorKey: 'userCount',
      header: 'Users',
      cell: ({ row }) => row.original.userCount,
    },
    {
      id: 'permissions',
      header: 'Permissions',
          cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
              {row.original.permissions.length > 0
                ? row.original.permissions
                    .map((permission: { module: string }) => getPermissionModuleLabel(permission.module))
                    .join(', ')
                : 'No access'}
            </span>
          ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isProtected = isProtectedSystemRoleSlug(row.original.slug);
        const isDeleteDisabled = isProtected || row.original.userCount > 0;

        return (
          <div className="flex items-center justify-end gap-2">
            {!isProtected ? (
              <Can I={PermissionAction.UPDATE} a={PermissionModule.ROLES}>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setRoleEditing(row.original);
                      setIsEditorOpen(true);
                    }}
                >
                  <PencilIcon className="size-3.5" />
                  Edit
                </Button>
              </Can>
            ) : null}
            <Can I={PermissionAction.DELETE} a={PermissionModule.ROLES}>
              <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive/80"
                  disabled={isDeleteDisabled}
                  onClick={() => setRolePendingDelete(row.original)}
              >
                <Trash2Icon className="size-3.5" />
                Delete
              </Button>
            </Can>
          </div>
        );
      },
    },
  ];

  async function handleSaveRole(input: {
    name: string;
    description: string;
    permissions: Array<{ module: PermissionModule; actions: Array<PermissionAction> }>;
  }) {
    try {
      if (roleEditing) {
        await updateRole({
          id: roleEditing.id,
          body: {
            name: input.name,
            description: input.description || null,
            permissions: input.permissions,
          },
        });
        toast.success('Role updated.');
      } else {
        await createRole({
          name: input.name,
          description: input.description || null,
          permissions: input.permissions,
        });
        toast.success('Role created.');
      }

      setRoleEditing(null);
      setIsEditorOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save role.');
    }
  }

  async function handleDeleteRole() {
    if (!rolePendingDelete) {
      return;
    }

    try {
      await deleteRole(rolePendingDelete.id);
      setRolePendingDelete(null);
      toast.success('Role deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete role.');
    }
  }

  return (
    <>
      <PermissionGuard module={PermissionModule.ROLES} action={PermissionAction.VIEW}>
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Can I={PermissionAction.CREATE} a={PermissionModule.ROLES}>
              <Button
                  type="button"
                  className="gap-2"
                  onClick={() => {
                    setRoleEditing(null);
                    setIsEditorOpen(true);
                  }}
              >
                <PlusIcon className="size-3.5" />
                New Role
              </Button>
            </Can>
          </div>

          <DataTable columns={columns} data={roles} isLoading={isLoading} />
        </div>
      </PermissionGuard>

      <RoleEditorModal
          key={roleEditing?.id ?? 'new-role'}
          open={isEditorOpen}
          role={roleEditing}
          isPending={isCreatePending || isUpdatePending}
          onOpenChange={(open) => {
            setIsEditorOpen(open);
            if (!open) {
              setRoleEditing(null);
            }
          }}
          onSubmit={handleSaveRole}
      />

      <ConfirmDeleteDialog
          open={Boolean(rolePendingDelete)}
          onOpenChange={(open) => {
            if (!open) {
              setRolePendingDelete(null);
            }
          }}
          title="Delete Role"
          description={`Delete "${rolePendingDelete?.name ?? ''}"? This cannot be undone.`}
          confirmLabel="Delete Role"
          isPending={isDeletePending}
          onConfirm={handleDeleteRole}
      />
    </>
  );
}

export function UsersSection() {
  const { data: rolesData } = useRoles();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [userEditing, setUserEditing] = useState<UserListItem | null>(null);
  const deferredSearch = useDeferredValue(searchInput);
  const { data, isLoading } = useUsers({
    search: deferredSearch,
    page,
    limit: USERS_PAGE_LIMIT,
  });
  const { mutateAsync: updateUserRoles, isPending } = useUpdateUserRoles();

  const users = data?.data.users ?? [];
  const totalPages = data?.data.pagination.totalPages ?? 1;
  const roles = rolesData?.data.roles ?? [];
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
              <Badge key={role.id} variant="secondary">
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
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Can I={PermissionAction.ASSIGN_ROLES} a={PermissionModule.USERS}>
          <div className="flex justify-end">
            <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setUserEditing(row.original)}
            >
              <UsersIcon className="size-3.5" />
              Assign Roles
            </Button>
          </div>
        </Can>
      ),
    },
  ];

  async function handleSaveUserRoles(roleIds: Array<string>) {
    if (!userEditing) {
      return;
    }

    try {
      await updateUserRoles({
        userId: userEditing.id,
        body: { roleIds },
      });
      setUserEditing(null);
      toast.success('User roles updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user roles.');
    }
  }

  return (
    <>
      <PermissionGuard module={PermissionModule.USERS} action={PermissionAction.VIEW}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Input
                placeholder="Search users..."
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                className="max-w-xs"
            />
          </div>

          <DataTable
              columns={columns}
              data={users}
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
      </PermissionGuard>

      <UserRolesModal
          key={userEditing?.id ?? 'user-roles'}
          open={Boolean(userEditing)}
          user={userEditing}
          roles={roles}
          isPending={isPending}
          onOpenChange={(open) => {
            if (!open) {
              setUserEditing(null);
            }
          }}
          onSubmit={handleSaveUserRoles}
      />
    </>
  );
}

function RoleEditorModal({
  open,
  role,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  role: RoleItem | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    name: string;
    description: string;
    permissions: Array<{ module: PermissionModule; actions: Array<PermissionAction> }>;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<PermissionSelectionState>(() => getInitialPermissionState(role));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      permissions: permissionModules
        .map((module) => ({
          module,
          actions: permissions[module],
        }))
        .filter((permission) => permission.actions.length > 0),
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setName(role?.name ?? '');
      setDescription(role?.description ?? '');
      setPermissions(getInitialPermissionState(role));
    } else if (!role) {
      setName('');
      setDescription('');
      setPermissions(createEmptyPermissionState());
    }

    onOpenChange(nextOpen);
  }

  return (
    <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={role ? `Edit ${role.name}` : 'Create Role'}
        className="sm:max-w-3xl"
        footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={ROLE_FORM_ID} disabled={isPending || name.trim().length === 0}>
            {role ? 'Save Role' : 'Create Role'}
          </Button>
        </div>
      )}
    >
      <form id={ROLE_FORM_ID} className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="role-name">Role Name</FieldLabel>
            <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Operations Manager"
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="role-description">Description</FieldLabel>
            <Textarea
                id="role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what this role can do"
                rows={3}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Permissions</h2>
            <p className="text-sm text-muted-foreground">
              Toggle the actions this role can perform in each module.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[160px_repeat(4,minmax(0,1fr))] gap-px bg-border text-xs font-medium text-muted-foreground">
              <div className="bg-background px-4 py-3">Module</div>
              <div className="bg-background px-4 py-3 text-center">Action 1</div>
              <div className="bg-background px-4 py-3 text-center">Action 2</div>
              <div className="bg-background px-4 py-3 text-center">Action 3</div>
              <div className="bg-background px-4 py-3 text-center">Action 4</div>
            </div>

            {permissionModules.map((module) => {
              const actions = getPermissionActions(module);

              return (
                <div
                    key={module}
                    className="grid grid-cols-[160px_repeat(4,minmax(0,1fr))] gap-px border-t border-border bg-border"
                >
                  <div className="bg-background px-4 py-3">
                    <div className="font-medium">{permissionCatalog[module].label}</div>
                    <div className="text-xs text-muted-foreground">{module}</div>
                  </div>

                  {Array.from({ length: 4 }).map((_, columnIndex) => {
                    const action = actions.at(columnIndex);

                    return (
                      <div
                          key={`${module}-${action ?? columnIndex}`}
                          className="flex min-h-16 items-center justify-center bg-background px-4 py-3"
                      >
                        {action ? (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={permissions[module].includes(action)}
                                onCheckedChange={(checked) => {
                                  setPermissions((previousPermissions) => ({
                                    ...previousPermissions,
                                    [module]: checked
                                      ? [...previousPermissions[module], action]
                                      : previousPermissions[module].filter((value) => value !== action),
                                  }));
                                }}
                            />
                            {getPermissionActionLabel(module, action)}
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function UserRolesModal({
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
  onSubmit: (roleIds: Array<string>) => Promise<void>;
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<Array<string>>(
    user?.roles.map((role: UserListItem['roles'][number]) => role.id) ?? [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(selectedRoleIds);
  }

  return (
    <Modal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedRoleIds(user?.roles.map((role: UserListItem['roles'][number]) => role.id) ?? []);
          }

          onOpenChange(nextOpen);
        }}
        title={user ? `Assign Roles to ${user.name}` : 'Assign Roles'}
        className="sm:max-w-xl"
        footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={USER_ROLE_FORM_ID} disabled={isPending}>
            Save Roles
          </Button>
        </div>
      )}
    >
      <form id={USER_ROLE_FORM_ID} className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-sm text-muted-foreground">
          Select one or more roles for this user. Permissions are combined across assigned roles.
        </p>

        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <label
                key={role.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={(checked) => {
                      setSelectedRoleIds((previousRoleIds) => (
                        checked
                          ? [...previousRoleIds, role.id]
                          : previousRoleIds.filter((roleId) => roleId !== role.id)
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

function createEmptyPermissionState(): PermissionSelectionState {
  return permissionModules.reduce((permissionState, module) => ({
    ...permissionState,
    [module]: [],
  }), {} as PermissionSelectionState);
}

function getInitialPermissionState(role: RoleItem | null) {
  const nextPermissionState = createEmptyPermissionState();

  if (!role) {
    return nextPermissionState;
  }

  for (const permission of role.permissions as Array<{ module: string; actions: Array<string> }>) {
    if (!isPermissionModule(permission.module)) {
      continue;
    }

    const permissionModule = permission.module;
    nextPermissionState[permissionModule] = permission.actions.filter((action: string): action is PermissionAction => (
      isPermissionAction(permissionModule, action)
    ));
  }

  return nextPermissionState;
}

function getPermissionModuleLabel(module: string) {
  return isPermissionModule(module) ? permissionCatalog[module].label : module;
}

function getPermissionActionLabel(module: PermissionModule, action: PermissionAction) {
  return (permissionCatalog[module].actions as Record<string, string>)[action] ?? action;
}
