import { useCan } from '@workspace/permissions/react';
import type { PermissionAction, PermissionModule } from '@workspace/permissions';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';

export function PermissionGuard({
  module,
  action,
  children,
  fallback,
}: {
  module: PermissionModule;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isAllowed = useCan(module, action);

  if (!isAllowed) {
    return fallback ?? <UnauthorizedState />;
  }

  return <>{children}</>;
}
