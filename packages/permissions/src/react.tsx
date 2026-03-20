import { createContext, useContext } from 'react';
import { createContextualCan } from '@casl/react';

import { buildAppAbility, canAccess } from './ability';

import type { PropsWithChildren } from 'react';
import type { AppAbility } from './ability';
import type { PermissionAction, PermissionModule } from './types';

const defaultAbility = buildAppAbility([], false);

const AbilityContext = createContext<AppAbility>(defaultAbility);
export const Can = createContextualCan(AbilityContext.Consumer);

export function AbilityProvider({
  ability,
  children,
}: PropsWithChildren<{ ability: AppAbility }>) {
  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}

export function useAbility() {
  return useContext(AbilityContext);
}

export function useCan(module: PermissionModule, action: PermissionAction) {
  const ability = useAbility();
  return canAccess(ability, module, action);
}
