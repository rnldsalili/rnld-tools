import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authClient } from '@workspace/auth-client';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => <Outlet />,
});
