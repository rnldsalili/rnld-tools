import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useSession, signOut } from '@workspace/auth-client';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  cn,
} from '@workspace/ui';
import { ChevronDownIcon, KeyRoundIcon, HashIcon, ShuffleIcon, LogOutIcon, SunIcon, MoonIcon, WrenchIcon } from 'lucide-react';
import { useTheme } from '@/app/hooks/use-theme';

const TOOLS = [
  { to: '/password-generator', icon: KeyRoundIcon, label: 'Password Generator' },
  { to: '/uuid-generator', icon: HashIcon, label: 'UUID Generator' },
  { to: '/secret-generator', icon: ShuffleIcon, label: 'Secret Generator' },
] as const;

const TOOL_PATHS = TOOLS.map((t) => t.to);

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { location } = useRouterState();
  const { isDark, mounted, toggle } = useTheme();

  const currentPath = location.pathname;
  const isOnToolRoute = TOOL_PATHS.some((p) => currentPath.startsWith(p));

  const userInitial =
    session?.user?.name?.[0]?.toUpperCase() ??
    session?.user?.email?.[0]?.toUpperCase() ??
    '?';

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: '/login' });
  }

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Left: brand */}
      <Link to="/" className="flex items-center gap-2 select-none">
        <span className="flex items-center justify-center size-6 rounded-md bg-primary text-primary-foreground shrink-0">
          <WrenchIcon className="size-3.5" />
        </span>
        <span className="text-sm font-semibold text-foreground tracking-tight">RTools</span>
      </Link>

      {/* Right: tools + auth + theme toggle */}
      <div className="flex items-center gap-1">
        {/* Tools dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'group gap-1.5 text-sm font-normal',
                'text-muted-foreground data-[state=open]:text-foreground data-[state=open]:bg-accent',
                isOnToolRoute && 'text-foreground',
              )}
            >
              <WrenchIcon className={cn('size-3.5 shrink-0', isOnToolRoute && 'text-primary')} />
              Tools
              <ChevronDownIcon className="size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              {TOOLS.map(({ to, icon: Icon, label }) => {
                const isActive = currentPath.startsWith(to);
                return (
                  <DropdownMenuItem key={to} asChild>
                    <Link
                      to={to}
                      className={cn('cursor-pointer gap-2.5', isActive && 'text-primary font-medium')}
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center size-6 rounded-md bg-accent text-accent-foreground shrink-0',
                          isActive && 'bg-primary/10 text-primary',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border mx-1.5" />

        {/* Auth */}
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/80"
              >
                {userInitial}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
                {session.user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <LogOutIcon className="size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        )}

        <div className="h-4 w-px bg-border mx-1.5" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted ? (
            isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />
          ) : (
            <MoonIcon className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
