import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/(clients)/clients')({
  staticData: { title: 'Clients' },
  component: () => <Outlet />,
});
