import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '@workspace/auth-client';
import { AppAuthorizationProvider } from '@/app/components/authorization/authorization-provider';
import { NavigationLayout } from '@/app/layouts/navigation-layout';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      throw redirect({ to: '/login', search: { next: location.href } });
    }
  },
  component: () => (
    <AppAuthorizationProvider>
      <NavigationLayout>
        <Outlet />
      </NavigationLayout>
    </AppAuthorizationProvider>
  ),
});
