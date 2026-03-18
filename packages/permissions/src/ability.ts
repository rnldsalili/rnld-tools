import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { PermissionAction } from './types';

import type { MongoAbility } from '@casl/ability';
import type { PermissionGrant, PermissionModule } from './types';

export type AbilityAction = PermissionAction;
export type AbilitySubject = PermissionModule | 'all';
export type AppAbility = MongoAbility<[AbilityAction, AbilitySubject]>;

export function buildAppAbility(
  permissions: Array<PermissionGrant>,
  hasSuperAdminRole: boolean,
): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (hasSuperAdminRole) {
    can(PermissionAction.MANAGE, 'all');
  } else {
    for (const permission of permissions) {
      can(permission.action, permission.module);
    }
  }

  return build();
}

export function canAccess(
  ability: AppAbility,
  module: PermissionModule,
  action: PermissionAction,
) {
  return ability.can(action, module);
}
