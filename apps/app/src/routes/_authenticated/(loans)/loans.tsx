import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/(loans)/loans')({
  staticData: { title: 'Loans' },
  component: () => <Outlet />,
});
