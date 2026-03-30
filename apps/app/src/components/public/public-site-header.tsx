import { Link, useLocation } from '@tanstack/react-router';
import { MenuIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
  useIsMobile,
} from '@workspace/ui';

import { PUBLIC_TOOLS } from '@/app/constants/public-tools';
import { useTheme } from '@/app/hooks/use-theme';

interface PublicSiteHeaderProps {
  variant?: 'home' | 'tools';
}

export function PublicSiteHeader({ variant = 'home' }: PublicSiteHeaderProps) {
  const { isDark, mounted, toggle } = useTheme();
  const location = useLocation();
  const isMobile = useIsMobile();
  const showToolNavigation = variant === 'tools';

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/78 backdrop-blur-xl supports-backdrop-filter:bg-background/62">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {showToolNavigation && isMobile ? <MobileToolsSheet currentPath={location.pathname} /> : null}

          <Link
              to="/"
              className="group flex min-w-0 items-center gap-2 rounded-xl transition-colors"
          >
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background/88 shadow-sm shadow-primary/5 transition-colors group-hover:border-border">
              <img
                  src="/web-app-manifest-512x512.png"
                  alt="RTools logo"
                  className="size-full object-cover"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                RTools
              </span>
              <span className="block truncate text-sm font-medium text-foreground">
                Secure everyday utilities
              </span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showToolNavigation && !isMobile ? (
            <nav className="hidden items-center gap-1.5 lg:flex">
              {PUBLIC_TOOLS.map(({ href, title }) => {
                const isActive = location.pathname === href;

                return (
                  <Link
                      key={href}
                      to={href}
                      className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/12 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                    )}
                  >
                    {title}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {showToolNavigation && !isMobile ? (
            <div className="hidden items-center gap-1 md:flex lg:hidden">
              {PUBLIC_TOOLS.map(({ href, title }) => {
                const isActive = location.pathname === href;
                const compactLabel = title.replace(' Generator', '');

                return (
                  <Link
                      key={href}
                      to={href}
                      className={cn(
                      'rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary/12 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                    )}
                  >
                    {compactLabel}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <Button asChild variant="outline" className="h-8.5 rounded-full px-3.5 text-sm">
            <Link to="/login">Login</Link>
          </Button>

          <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8.5 rounded-full border border-border/70 bg-background/80 hover:bg-muted/80"
              onClick={toggle}
              aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Toggle theme'}
          >
            {mounted ? (
              isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />
            ) : (
              <MoonIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function MobileToolsSheet({ currentPath }: { currentPath: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8.5 rounded-full border border-border/70 bg-background/80 hover:bg-muted/80"
            aria-label="Open tools menu"
        >
          <MenuIcon className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[17.5rem] max-w-[17.5rem] border-border/70 bg-background/96 p-0 sm:max-w-[17.5rem]"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold">RTools</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-3 py-3">
          {PUBLIC_TOOLS.map(({ benefit, href, title }) => {
            const isActive = currentPath === href;

            return (
              <Link
                  key={href}
                  to={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                  'rounded-2xl px-3 py-3 transition-colors',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'hover:bg-muted/70',
                )}
              >
                <span className="block text-sm font-semibold">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {benefit}
                </span>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
