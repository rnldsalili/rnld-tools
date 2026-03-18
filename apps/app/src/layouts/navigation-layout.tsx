import { Link, useLocation, useMatches, useRouter } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import {
  BellRingIcon,
  ChevronRightIcon,
  HandCoinsIcon,
  HashIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ScrollTextIcon,
  ShuffleIcon,
  SunIcon,
  UsersIcon,
  WrenchIcon,
} from 'lucide-react';
import { signOut, useSession } from '@workspace/auth-client';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@workspace/ui';
import { useTheme } from '@/app/hooks/use-theme';
import { sidebarCollapsedAtom } from '@/app/stores/sidebar';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NAV_ITEMS: Array<NavItem> = [
  { to: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
  { to: '/clients', icon: UsersIcon, label: 'Clients' },
  { to: '/loans', icon: HandCoinsIcon, label: 'Loans' },
];

const TOOL_NAV_ITEMS: Array<NavItem> = [
  { to: '/password-generator', icon: KeyRoundIcon, label: 'Password Generator' },
  { to: '/uuid-generator', icon: HashIcon, label: 'UUID Generator' },
  { to: '/secret-generator', icon: ShuffleIcon, label: 'Secret Generator' },
];

const SETTINGS_NAV_ITEMS: Array<NavItem> = [
  { to: '/settings/documents', icon: ScrollTextIcon, label: 'Documents' },
  { to: '/settings/notifications', icon: BellRingIcon, label: 'Notifications' },
];

function SidebarNavItem({
  item,
  isCollapsed,
  currentPath,
}: {
  item: NavItem;
  isCollapsed: boolean;
  currentPath: string;
}) {
  const isActive = currentPath === item.to || currentPath.startsWith(`${item.to}/`);
  const Icon = item.icon;

  const linkContent = (
    <Link
        to={item.to}
        className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        isActive && 'bg-accent text-foreground font-medium',
        isCollapsed && 'justify-center px-2',
      )}
    >
      <Icon className={cn('shrink-0', isCollapsed ? 'size-4' : 'size-3.5')} />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function Breadcrumb() {
  const matches = useMatches();

  const crumbs = matches
    .filter((match) => (match.staticData as { title?: string }).title)
    .map((match) => ({
      title: (match.staticData as { title: string }).title,
      pathname: match.pathname,
    }));

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.pathname} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-3.5 shrink-0" />}
            {isLast ? (
              <span className="text-foreground font-medium">{crumb.title}</span>
            ) : (
              <Link
                  to={crumb.pathname as any}
                  className="hover:text-foreground transition-colors"
              >
                {crumb.title}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

interface NavigationLayoutProps {
  children: React.ReactNode;
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { pathname: currentPath } = useLocation();
  const { isDark, mounted, toggle } = useTheme();
  const [isCollapsed, setIsCollapsed] = useAtom(sidebarCollapsedAtom);

  if (!session?.user) {
    return <>{children}</>;
  }

  const userInitial =
    session.user.name.charAt(0).toUpperCase() ||
    session.user.email.charAt(0).toUpperCase() ||
    '?';

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: '/login' });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside
            className={cn(
            'flex flex-col border-r border-border bg-background transition-[width] duration-200 ease-in-out shrink-0',
            isCollapsed ? 'w-12' : 'w-52',
          )}
        >
          {/* Sidebar header */}
          <div
              className={cn(
              'flex h-14 items-center border-b border-border shrink-0',
              isCollapsed ? 'justify-center px-2' : 'justify-between px-3',
            )}
          >
            {!isCollapsed && (
              <Link to="/" className="flex items-center gap-2 select-none min-w-0">
                <span className="flex items-center justify-center size-6 rounded-md bg-primary text-primary-foreground shrink-0">
                  <WrenchIcon className="size-3.5" />
                </span>
                <span className="text-sm font-semibold text-foreground tracking-tight truncate">
                  RTools
                </span>
              </Link>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? (
                    <PanelLeftOpenIcon className="size-3.5" />
                  ) : (
                    <PanelLeftCloseIcon className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem
                  key={item.to}
                  item={item}
                  isCollapsed={isCollapsed}
                  currentPath={currentPath}
              />
            ))}

            {/* Tools section */}
            <div className={cn('mt-4', !isCollapsed && 'px-2.5')}>
              {!isCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Tools
                </p>
              )}
              {isCollapsed && <div className="h-px bg-border mb-2" />}
            </div>

            {TOOL_NAV_ITEMS.map((item) => (
              <SidebarNavItem
                  key={item.to}
                  item={item}
                  isCollapsed={isCollapsed}
                  currentPath={currentPath}
              />
            ))}

            {/* Settings section */}
            <div className={cn('mt-4', !isCollapsed && 'px-2.5')}>
              {!isCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Settings
                </p>
              )}
              {isCollapsed && <div className="h-px bg-border mb-2" />}
            </div>

            {SETTINGS_NAV_ITEMS.map((item) => (
              <SidebarNavItem
                  key={item.to}
                  item={item}
                  isCollapsed={isCollapsed}
                  currentPath={currentPath}
              />
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu toggle (visible on small screens) */}
              <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 md:hidden"
                  onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <MenuIcon className="size-4" />
              </Button>
              <Breadcrumb />
            </div>

            <div className="flex items-center gap-1">
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

              <div className="h-4 w-px bg-border mx-1" />

              {/* User menu */}
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
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
