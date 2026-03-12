import { Link, useRouter } from '@tanstack/react-router';
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
import { ChevronDownIcon, KeyRoundIcon, HashIcon, ShuffleIcon, LogOutIcon, SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from '@/app/hooks/use-theme';

export default function header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isDark, mounted, toggle } = useTheme();

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: '/login' });
  }

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Left: logo */}
      <Link
        to="/"
        className="text-sm font-semibold text-foreground tracking-tight"
      >
        RTools
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
                'gap-1.5 text-sm text-muted-foreground font-normal',
                'data-[state=open]:text-foreground data-[state=open]:bg-accent'
              )}
            >
              Tools
              <ChevronDownIcon
                data-icon="inline-end"
                className="transition-transform duration-200 data-[state=open]:rotate-180"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Tools</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/password-generator" className="cursor-pointer">
                  <KeyRoundIcon />
                  Password Generator
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/uuid-generator" className="cursor-pointer">
                  <HashIcon />
                  UUID Generator
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/secret-generator" className="cursor-pointer">
                  <ShuffleIcon />
                  Secret Generator
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Auth */}
        {session ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground truncate max-w-40 px-2">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login" className="text-muted-foreground">
              Sign in
            </Link>
          </Button>
        )}

        {/* Separator */}
        <div className="mx-2 h-4 w-px bg-border" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted ? (isDark ? <SunIcon /> : <MoonIcon />) : <MoonIcon />}
        </Button>
      </div>
    </header>
  );
}
