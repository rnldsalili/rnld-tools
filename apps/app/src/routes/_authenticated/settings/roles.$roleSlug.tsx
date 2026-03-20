import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, Loader2Icon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Checkbox,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import {
  PermissionAction,
  PermissionModule,
  getPermissionActionLabel,
  getPermissionActions,
  getPermissionModuleLabel,
  hasSuperAdminRole,
  permissionModules,
} from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import type { Dispatch, SetStateAction } from 'react';
import type { RoleItem } from '@/app/hooks/use-roles';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { AuthenticatedDetailPageShell } from '@/app/components/layout/authenticated-detail-page-shell';
import { useRoles, useUpdateRolePermissions } from '@/app/hooks/use-roles';

export const Route = createFileRoute('/_authenticated/settings/roles/$roleSlug')({
  head: () => ({ meta: [{ title: 'RTools - Role Detail' }] }),
  staticData: { title: 'Role Detail' },
  component: RoleDetailPage,
});

function RoleDetailPage() {
  const { roleSlug } = Route.useParams();
  const { authorization } = useAppAuthorization();
  const currentUserHasSuperAdminRole = authorization
    ? hasSuperAdminRole(authorization.roles)
    : false;
  const canViewRoles = useCan(PermissionModule.ROLES, PermissionAction.VIEW);
  const { data, isLoading, isError } = useRoles();

  const role = data?.data.roles.find((roleItem) => roleItem.slug === roleSlug) ?? null;
  const canEdit = role ? currentUserHasSuperAdminRole && !role.hasFullAccess : false;

  useEffect(() => {
    if (role) {
      document.title = `RTools - ${role.name}`;
    }
  }, [role]);

  if (!canViewRoles) {
    return (
      <UnauthorizedState
          title="Role Access Restricted"
          description="You do not have permission to view this role."
      />
    );
  }

  if (isLoading) {
    return (
      <AuthenticatedDetailPageShell
          icon={ShieldCheckIcon}
          title="Role Detail"
          description="Review and manage the permissions assigned to this built-in role."
          backAction={(
            <Button variant="ghost" asChild>
              <Link to="/settings/roles">
                <ArrowLeftIcon className="size-3.5" />
                Back
              </Link>
            </Button>
          )}
      >
        <SectionCard>
          <SectionCardContent className="flex justify-center py-10">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </SectionCardContent>
        </SectionCard>
      </AuthenticatedDetailPageShell>
    );
  }

  if (!role) {
    return (
      <AuthenticatedDetailPageShell
          icon={ShieldCheckIcon}
          title="Role Detail"
          description="Review and manage the permissions assigned to this built-in role."
          backAction={(
            <Button variant="ghost" asChild>
              <Link to="/settings/roles">
                <ArrowLeftIcon className="size-3.5" />
                Back
              </Link>
            </Button>
          )}
      >
        <SectionCard>
          <SectionCardHeader className="flex flex-col items-start gap-2">
            <div>
              <h2 className="text-base font-semibold">Role Not Found</h2>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'The role could not be loaded.'
                  : 'This role does not exist in the current role catalog.'}
              </p>
            </div>
          </SectionCardHeader>
          <SectionCardContent>
            <Button variant="ghost" asChild>
              <Link to="/settings/roles">
                <ArrowLeftIcon className="size-3.5" />
                Back to Roles
              </Link>
            </Button>
          </SectionCardContent>
        </SectionCard>
      </AuthenticatedDetailPageShell>
    );
  }

  return (
    <LoadedRoleDetailPage
        key={`${role.slug}:${serializeRolePermissions(role.permissions)}`}
        role={role}
        canEdit={canEdit}
    />
  );
}

function LoadedRoleDetailPage({
  role,
  canEdit,
}: {
  role: RoleItem;
  canEdit: boolean;
}) {
  const { mutateAsync: updateRolePermissions, isPending } = useUpdateRolePermissions();
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(
    createPermissionKeySet(role.permissions),
  );
  const initialPermissionKeys = createPermissionKeySet(role.permissions);
  const hasChanges = !arePermissionSetsEqual(initialPermissionKeys, selectedPermissionKeys);

  async function handleSave() {
    try {
      await updateRolePermissions({
        roleSlug: role.slug,
        body: {
          permissions: permissionModules.map((module) => ({
            module,
            actions: getPermissionActions(module).filter((action) => (
              selectedPermissionKeys.has(createPermissionKey(module, action))
            )),
          })),
        },
      });
      toast.success(`${role.name} permissions updated.`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <AuthenticatedDetailPageShell
        icon={ShieldCheckIcon}
        title={role.name}
        description="Review and manage the permissions assigned to this built-in role."
        backAction={(
          <Button variant="ghost" asChild>
            <Link to="/settings/roles">
              <ArrowLeftIcon className="size-3.5" />
              Back
            </Link>
          </Button>
        )}
        action={canEdit ? (
          <Button type="button" onClick={() => void handleSave()} disabled={isPending || !hasChanges} className="gap-2">
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            Save
          </Button>
        ) : null}
        meta={<RoleDetailMeta role={role} canEdit={canEdit} />}
    >
      <RolePermissionMatrixSection
          role={role}
          canEdit={canEdit}
          selectedPermissionKeys={selectedPermissionKeys}
          onSelectedPermissionKeysChange={setSelectedPermissionKeys}
      />
    </AuthenticatedDetailPageShell>
  );
}

function RoleDetailMeta({
  role,
  canEdit,
}: {
  role: RoleItem;
  canEdit: boolean;
}) {
  const assignedUserCount = role.userCount ?? 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">
          {role.description || 'No description available.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {assignedUserCount} assigned user{assignedUserCount === 1 ? '' : 's'}
        </Badge>
        {role.hasFullAccess ? <Badge>Full Access</Badge> : null}
        {!canEdit && !role.hasFullAccess ? <Badge variant="outline">Read Only</Badge> : null}
      </div>
    </div>
  );
}

function RolePermissionMatrixSection({
  role,
  canEdit,
  selectedPermissionKeys,
  onSelectedPermissionKeysChange,
}: {
  role: RoleItem;
  canEdit: boolean;
  selectedPermissionKeys: Set<string>;
  onSelectedPermissionKeysChange: Dispatch<SetStateAction<Set<string>>>;
}) {
  return (
    <SectionCard>
      <SectionCardHeader className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Permission Matrix</h2>
          <p className="text-sm text-muted-foreground">
            {role.hasFullAccess
              ? 'This protected role always has access to every module and action.'
              : canEdit
                ? 'Configure which actions this role can perform in each module.'
                : 'Review which actions this role can perform in each module.'}
          </p>
        </div>
        {!role.hasFullAccess && !canEdit ? (
          <Badge variant="outline">Read Only</Badge>
        ) : null}
      </SectionCardHeader>

      <SectionCardContent>
        {role.hasFullAccess ? (
          <p className="text-sm text-muted-foreground">
            This protected role always has access to every module and action.
          </p>
        ) : (
          <div className="space-y-4">
            {permissionModules.map((module) => (
              <div key={module} className="rounded-lg border border-border/80 bg-muted/[0.08] p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium">{getPermissionModuleLabel(module)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {canEdit
                      ? 'Configure which actions this role can perform.'
                      : 'Review which actions this role can perform.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {getPermissionActions(module).map((action) => (
                    canEdit ? (
                      <label key={action} className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={selectedPermissionKeys.has(createPermissionKey(module, action))}
                            onCheckedChange={(checked) => {
                              onSelectedPermissionKeysChange((previousPermissionKeys) => {
                                const nextPermissionKeys = new Set(previousPermissionKeys);
                                const permissionKey = createPermissionKey(module, action);

                                if (checked) {
                                  nextPermissionKeys.add(permissionKey);
                                } else {
                                  nextPermissionKeys.delete(permissionKey);
                                }

                                return nextPermissionKeys;
                              });
                            }}
                        />
                        <span>{getPermissionActionLabel(module, action)}</span>
                      </label>
                    ) : (
                      <Badge
                          key={action}
                          variant={selectedPermissionKeys.has(createPermissionKey(module, action)) ? 'default' : 'outline'}
                      >
                        {getPermissionActionLabel(module, action)}
                      </Badge>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}

function createPermissionKey(module: PermissionModule, action: PermissionAction) {
  return `${module}:${action}`;
}

function createPermissionKeySet(rolePermissions: RoleItem['permissions']) {
  return new Set(
    rolePermissions.flatMap((permission) => (
      permission.actions.map((action) => createPermissionKey(permission.module, action))
    )),
  );
}

function arePermissionSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function serializeRolePermissions(rolePermissions: RoleItem['permissions']) {
  return rolePermissions
    .flatMap((permission) => permission.actions.map((action) => createPermissionKey(permission.module, action)))
    .sort()
    .join('|');
}
