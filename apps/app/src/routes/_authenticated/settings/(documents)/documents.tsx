import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/settings/(documents)/documents')({
  staticData: { title: 'Documents' },
  component: () => <Outlet />,
});
