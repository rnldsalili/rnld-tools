import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = '(min-width: 768px)';

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const media = window.matchMedia(MOBILE_BREAKPOINT);
  media.addEventListener('change', onStoreChange);

  return () => media.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false;
  }

  return !window.matchMedia(MOBILE_BREAKPOINT).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
