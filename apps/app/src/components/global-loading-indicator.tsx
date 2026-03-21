import { useRouterState } from '@tanstack/react-router';

export function GlobalLoadingIndicator() {
  const routerState = useRouterState({
    select: (state) => ({
      isLoading: state.isLoading,
      status: state.status,
    }),
  });

  const isLoading = routerState.isLoading || routerState.status === 'pending';

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden">
      <div className="h-full bg-primary animate-progress-indicator" />
    </div>
  );
}
