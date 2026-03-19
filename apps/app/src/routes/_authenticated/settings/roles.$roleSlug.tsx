import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, Loader2Icon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
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
import type { RoleItem } from '@/app/hooks/use-roles';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
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

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheckIcon className="size-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">
                {role ? role.name : 'Role Detail'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and manage the permissions assigned to this built-in role.
              </p>
            </div>
          </div>

          <Button variant="ghost" asChild>
            <Link to="/settings/roles">
              <ArrowLeftIcon className="size-3.5" />
              Back
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center py-10">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : role ? (
          <RoleDetailCard
              key={`${role.slug}:${serializeRolePermissions(role.permissions)}`}
              role={role}
              canEdit={currentUserHasSuperAdminRole && !role.hasFullAccess}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Role Not Found</CardTitle>
              <CardDescription>
                {isError
                  ? 'The role could not be loaded.'
                  : 'This role does not exist in the current role catalog.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild>
                <Link to="/settings/roles">
                  <ArrowLeftIcon className="size-3.5" />
                  Back to Roles
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RoleDetailCard({
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
      toast.error(error instanceof Error ? error.message : 'Failed to update role permissions.');
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{role.name}</CardTitle>
            <CardDescription>{role.description || 'No description available.'}</CardDescription>
            {role.userCount ? (
              <p className="text-sm text-muted-foreground">
                Assigned to {role.userCount} {role.userCount === 1 ? 'user' : 'users'}.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {role.hasFullAccess ? <Badge>Full Access</Badge> : null}
              {!canEdit && !role.hasFullAccess ? <Badge variant="outline">Read Only</Badge> : null}
            </div>
          </div>

          {canEdit ? (
            <Button type="button" onClick={() => void handleSave()} disabled={isPending || !hasChanges}>
              {isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="size-3.5" />
              )}
              Save
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {role.hasFullAccess ? (
          <div className="text-sm text-muted-foreground">
            This protected role always has access to every module and action.
          </div>
        ) : (
          <div className="space-y-4">
            {permissionModules.map((module) => (
              <div key={module} className="rounded-lg border border-border p-4">
                <div className="mb-3">
                  <h2 className="text-sm font-medium">{getPermissionModuleLabel(module)}</h2>
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
                              setSelectedPermissionKeys((previousPermissionKeys) => {
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
      </CardContent>
    </Card>
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
