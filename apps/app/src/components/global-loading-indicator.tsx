import { useEffect, useState } from 'react';
import { useRouter, useRouterState } from '@tanstack/react-router';

export function GlobalLoadingIndicator() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const isRouterLoading = useRouterState({
    select: (state) => state.isLoading,
  });

  useEffect(() => {
    const unsubscribeBeforeLoad = router.subscribe('onBeforeLoad', () => {
      setIsNavigating(true);
    });

    const unsubscribeResolved = router.subscribe('onResolved', () => {
      setIsNavigating(false);
    });

    return () => {
      unsubscribeBeforeLoad();
      unsubscribeResolved();
      setIsNavigating(false);
    };
  }, [router]);

  const isLoading = isRouterLoading || isNavigating;

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden">
      <div className="h-full bg-primary animate-progress-indicator" />
    </div>
  );
}
