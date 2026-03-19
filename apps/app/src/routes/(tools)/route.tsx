import { Outlet, createFileRoute } from '@tanstack/react-router';
import { BasicLayout } from '@/app/layouts/basic-layout';

export const Route = createFileRoute('/(tools)')({
  component: () => (
    <BasicLayout>
      <Outlet />
    </BasicLayout>
  ),
});
