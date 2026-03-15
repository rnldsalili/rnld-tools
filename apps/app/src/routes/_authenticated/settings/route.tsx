import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/settings')({
  staticData: { title: 'Settings' },
  component: () => <Outlet />,
});
