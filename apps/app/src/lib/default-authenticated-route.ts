import {
  PermissionAction,
  PermissionModule,
  buildAppAbility,
  canAccess,
  hasSuperAdminRole,
} from '@workspace/permissions';
import type { PermissionGrant, RoleSummary } from '@workspace/permissions';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

type AuthorizationLike = {
  permissions: Array<PermissionGrant>;
  roles: Array<RoleSummary>;
};

const AUTHENTICATED_DESTINATIONS = [
  { path: '/dashboard', module: PermissionModule.DASHBOARD, action: PermissionAction.VIEW },
  { path: '/clients', module: PermissionModule.CLIENTS, action: PermissionAction.VIEW },
  { path: '/loans', module: PermissionModule.LOANS, action: PermissionAction.VIEW },
  { path: '/settings/documents', module: PermissionModule.DOCUMENTS, action: PermissionAction.VIEW },
  { path: '/settings/notifications', module: PermissionModule.NOTIFICATIONS, action: PermissionAction.VIEW },
  { path: '/settings/roles', module: PermissionModule.ROLES, action: PermissionAction.VIEW },
  { path: '/settings/users', module: PermissionModule.USERS, action: PermissionAction.VIEW },
] as const;

export type AuthenticatedDestinationPath = (typeof AUTHENTICATED_DESTINATIONS)[number]['path'] | '/';

export function getDefaultAuthenticatedDestination(
  authorization: AuthorizationLike | null | undefined,
): AuthenticatedDestinationPath {
  if (!authorization) {
    return '/';
  }

  const ability = buildAppAbility(
    authorization.permissions,
    hasSuperAdminRole(authorization.roles),
  );

  const matchingDestination = AUTHENTICATED_DESTINATIONS.find((destination) => (
    canAccess(ability, destination.module, destination.action)
  ));

  return matchingDestination?.path ?? '/';
}

export async function resolveDefaultAuthenticatedDestination() {
  try {
    const response = await apiClient.users.me.$get();
    const result = await parseOkResponseOrThrow(
      response,
      'Failed to load authorization details.',
    );

    return getDefaultAuthenticatedDestination(result.data);
  } catch {
    return '/' as const;
  }
}
