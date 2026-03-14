import { useEffect, useState } from 'react';

import { useAtom } from 'jotai';

import { themeAtom } from '@/app/stores/theme';

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom);
  const [mounted, setMounted] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

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
