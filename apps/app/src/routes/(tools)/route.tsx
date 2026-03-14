import { Outlet, createFileRoute } from '@tanstack/react-router';
import { NavigationLayout } from '@/app/layouts/navigation-layout';

export const Route = createFileRoute('/(tools)')({
  component: () => (
    <NavigationLayout>
      <Outlet />
    </NavigationLayout>
  ),
});
