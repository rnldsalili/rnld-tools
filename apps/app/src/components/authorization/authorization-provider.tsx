import { createContext, useContext } from 'react';
import { buildAppAbility, hasSuperAdminRole } from '@workspace/permissions';
import { AbilityProvider } from '@workspace/permissions/react';
import { Loader2Icon } from 'lucide-react';
import { Card, CardContent } from '@workspace/ui';
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
      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
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
