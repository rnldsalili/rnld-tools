import { useEffect, useSyncExternalStore } from 'react';

import { useAtom } from 'jotai';

import { themeAtom } from '@/app/stores/theme';

function subscribe() { return () => {}; }

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark, mounted]);

  function toggle() {
    setTheme(isDark ? 'light' : 'dark');
  }

  return { isDark, mounted, toggle };
}
