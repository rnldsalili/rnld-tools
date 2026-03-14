import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/loans')({
  staticData: { title: 'Loans' },
  component: () => <Outlet />,
});
