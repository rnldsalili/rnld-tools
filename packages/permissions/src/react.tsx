import { createContext, useContext } from 'react';
import { createContextualCan } from '@casl/react';

import { canAccess } from './ability';

import type { Consumer, PropsWithChildren } from 'react';
import type { AppAbility } from './ability';
import type { PermissionAction, PermissionModule } from './types';

const AbilityContext = createContext<AppAbility | null>(null);
export const Can = createContextualCan(AbilityContext.Consumer as Consumer<AppAbility>);

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
  const ability = useContext(AbilityContext);

  if (!ability) {
    throw new Error('Ability context is not available.');
  }

  return ability;
}

export function useCan(module: PermissionModule, action: PermissionAction) {
  const ability = useAbility();
  return canAccess(ability, module, action);
}
