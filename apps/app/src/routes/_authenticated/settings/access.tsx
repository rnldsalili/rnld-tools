import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/settings/access')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/roles', replace: true });
  },
  component: () => null,
});
