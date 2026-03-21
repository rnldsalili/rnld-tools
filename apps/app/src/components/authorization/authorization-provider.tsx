import { createContext, useContext } from 'react';
import { buildAppAbility, hasSuperAdminRole } from '@workspace/permissions';
import { AbilityProvider } from '@workspace/permissions/react';
import { LoadingState } from '@workspace/ui';
import type { AuthorizationResponse } from '@/app/hooks/use-authorization';
import { useAuthorizationQuery } from '@/app/hooks/use-authorization';

type AuthorizationContextValue = {
  authorization: AuthorizationResponse['data'] | null;
  isLoading: boolean;
};

const defaultAuthorizationContextValue: AuthorizationContextValue = {
  authorization: null,
  isLoading: false,
};

const AuthorizationContext = createContext<AuthorizationContextValue>(defaultAuthorizationContextValue);

export function AppAuthorizationProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useAuthorizationQuery();
  const authorization = data?.data ?? null;
  const ability = buildAppAbility(
    authorization?.permissions ?? [],
    authorization ? hasSuperAdminRole(authorization.roles) : false,
  );

  if (isLoading) {
    return (
      <LoadingState
          className="min-h-screen px-6 py-10"
      />
    );
  }

  return (
    <AuthorizationContext.Provider value={{ authorization, isLoading }}>
      <AbilityProvider ability={ability}>
        {children}
      </AbilityProvider>
    </AuthorizationContext.Provider>
  );
}

export function useAppAuthorization() {
  return useContext(AuthorizationContext);
}
