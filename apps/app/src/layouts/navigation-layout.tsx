import { Link, useLocation, useMatches, useRouter } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import {
  BellRingIcon,
  ChevronRightIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react';
import { signOut, useSession } from '@workspace/auth-client';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useAbility } from '@workspace/permissions/react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
  useIsMobile,
} from '@workspace/ui';
import { useAppAuthorization } from '@/app/components/authorization/authorization-provider';
import { useTheme } from '@/app/hooks/use-theme';
import { sidebarCollapsedAtom } from '@/app/stores/sidebar';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  isVisible?: (
    hasPermission: (module: PermissionModule, action: PermissionAction) => boolean,
  ) => boolean;
}

const NAV_ITEMS: Array<NavItem> = [
  {
    to: '/dashboard',
    icon: LayoutDashboardIcon,
    label: 'Dashboard',
    isVisible: (hasPermission) => hasPermission(PermissionModule.DASHBOARD, PermissionAction.VIEW),
  },
  {
    to: '/clients',
    icon: UsersIcon,
    label: 'Clients',
    isVisible: (hasPermission) => hasPermission(PermissionModule.CLIENTS, PermissionAction.VIEW),
  },
  {
    to: '/loans',
    icon: HandCoinsIcon,
    label: 'Loans',
    isVisible: (hasPermission) => hasPermission(PermissionModule.LOANS, PermissionAction.VIEW),
  },
];

const SETTINGS_NAV_ITEMS: Array<NavItem> = [
  {
    to: '/settings/documents',
    icon: ScrollTextIcon,
    label: 'Documents',
    isVisible: (hasPermission) => hasPermission(PermissionModule.DOCUMENTS, PermissionAction.VIEW),
  },
  {
    to: '/settings/notifications',
    icon: BellRingIcon,
    label: 'Notifications',
    isVisible: (hasPermission) => hasPermission(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW),
  },
  {
    to: '/settings/roles',
    icon: ShieldCheckIcon,
    label: 'Roles',
    isVisible: (hasPermission) => hasPermission(PermissionModule.ROLES, PermissionAction.VIEW),
  },
  {
    to: '/settings/users',
    icon: UsersIcon,
    label: 'Users',
    isVisible: (hasPermission) => hasPermission(PermissionModule.USERS, PermissionAction.VIEW),
  },
];

function isActivePath(currentPath: string, itemPath: string) {
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function SidebarBrand({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Link
        to="/"
        className={cn(
        'group flex min-w-0 items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-background/70 transition-colors hover:bg-background',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-3',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border/70 bg-background shadow-sm">
        <img
            src="/web-app-manifest-512x512.png"
            alt="RTools logo"
            className="size-full object-cover"
        />
      </span>
      {!isCollapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-2xl font-semibold tracking-tight text-sidebar-foreground">
            Tools
          </span>
        </span>
      )}
    </Link>
  );
}

function SidebarNavItem({
  item,
  isCollapsed,
  currentPath,
  onSelect,
}: {
  item: NavItem;
  isCollapsed: boolean;
  currentPath: string;
  onSelect?: () => void;
}) {
  const isActive = isActivePath(currentPath, item.to);
  const Icon = item.icon;

  const linkContent = (
    <Link
        to={item.to}
        onClick={onSelect}
        className={cn(
        'group flex items-center gap-3 rounded-xl border border-transparent transition-all duration-200',
        'text-sidebar-foreground/70 hover:border-sidebar-border hover:bg-sidebar-accent/80 hover:text-sidebar-foreground',
        isActive && 'border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-sm shadow-black/5 dark:shadow-black/20',
        isCollapsed ? 'justify-center px-2.5 py-2.5' : 'px-3 py-2.5',
      )}
    >
      <span
          className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
          isActive
            ? 'border-sidebar-primary/15 bg-sidebar-primary text-sidebar-primary-foreground'
            : 'border-sidebar-border/70 bg-background/70 text-sidebar-foreground/70 group-hover:border-sidebar-border group-hover:bg-background group-hover:text-sidebar-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      {!isCollapsed && (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.label}
        </span>
      )}
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

function SidebarSection({
  title,
  items,
  isCollapsed,
  currentPath,
  onItemSelect,
}: {
  title: string;
  items: Array<NavItem>;
  isCollapsed: boolean;
  currentPath: string;
  onItemSelect?: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      {isCollapsed ? (
        <div className="px-2">
          <Separator className="bg-sidebar-border" />
        </div>
      ) : (
        <div className="px-3">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/45">
            {title}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <SidebarNavItem
              key={item.to}
              item={item}
              isCollapsed={isCollapsed}
              currentPath={currentPath}
              onSelect={onItemSelect}
          />
        ))}
      </div>
    </section>
  );
}

function SidebarContent({
  currentPath,
  isCollapsed,
  navItems,
  settingsItems,
  onItemSelect,
}: {
  currentPath: string;
  isCollapsed: boolean;
  navItems: Array<NavItem>;
  settingsItems: Array<NavItem>;
  onItemSelect?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
          className={cn(
          'flex gap-2 p-3',
          isCollapsed ? 'flex-col items-center px-2.5' : 'items-start',
        )}
      >
        <div className="min-w-0 flex-1">
          <SidebarBrand isCollapsed={isCollapsed} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-5">
          <SidebarSection
              title="Workspace"
              items={navItems}
              isCollapsed={isCollapsed}
              currentPath={currentPath}
              onItemSelect={onItemSelect}
          />
          <SidebarSection
              title="Settings"
              items={settingsItems}
              isCollapsed={isCollapsed}
              currentPath={currentPath}
              onItemSelect={onItemSelect}
          />
        </div>
      </div>
    </div>
  );
}

function MobileNavigationSheet({
  currentPath,
  navItems,
  settingsItems,
}: {
  currentPath: string;
  navItems: Array<NavItem>;
  settingsItems: Array<NavItem>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full border border-border/70 bg-background/80 hover:bg-muted/80"
            aria-label="Open navigation menu"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[18rem] max-w-[18rem] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[18rem]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation menu</SheetTitle>
        </SheetHeader>
        <SidebarContent
            currentPath={currentPath}
            isCollapsed={false}
            navItems={navItems}
            settingsItems={settingsItems}
            onItemSelect={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function Breadcrumb() {
  const matches = useMatches();
  const router = useRouter();

  const crumbs = matches
    .map((match) => ({
      title: getMatchTitle(match.staticData),
      pathname: match.pathname,
    }))
    .filter((match): match is { title: string; pathname: string } => Boolean(match.title));

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
              <button
                  type="button"
                  className="hover:text-foreground transition-colors"
                  onClick={() => router.history.push(crumb.pathname)}
              >
                {crumb.title}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function getMatchTitle(staticData: unknown) {
  if (!staticData || typeof staticData !== 'object') {
    return null;
  }

  const title = Reflect.get(staticData, 'title');
  return typeof title === 'string' ? title : null;
}

interface NavigationLayoutProps {
  children: React.ReactNode;
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const { data: session } = useSession();
  const ability = useAbility();
  const { authorization } = useAppAuthorization();
  const router = useRouter();
  const { pathname: currentPath } = useLocation();
  const { isDark, mounted, toggle } = useTheme();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  const requiresPasswordChange = authorization?.user.mustChangePassword ?? false;

  useEffect(() => {
    if (session?.user && requiresPasswordChange && currentPath !== '/change-password') {
      void router.navigate({ to: '/change-password', replace: true });
    }
  }, [currentPath, requiresPasswordChange, router, session?.user]);

  if (!session?.user) {
    return <>{children}</>;
  }

  if (requiresPasswordChange) {
    return currentPath === '/change-password'
      ? <>{children}</>
      : null;
  }

  function hasPermission(module: PermissionModule, action: PermissionAction) {
    return ability.can(action, module);
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => item.isVisible?.(hasPermission) ?? true);
  const visibleSettingsItems = SETTINGS_NAV_ITEMS.filter(
    (item) => item.isVisible?.(hasPermission) ?? true,
  );

  const userInitial =
    session.user.name.charAt(0).toUpperCase() ||
    session.user.email.charAt(0).toUpperCase() ||
    '?';

  const userDisplayName = session.user.name || session.user.email;
  const userRoles = authorization?.roles ?? [];

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: '/login' });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {!isMobile ? (
          <aside
              className={cn(
              'shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out',
              isCollapsed ? 'w-22' : 'w-74',
            )}
          >
            <SidebarContent
                currentPath={currentPath}
                isCollapsed={isCollapsed}
                navItems={visibleNavItems}
                settingsItems={visibleSettingsItems}
            />
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              {isMobile ? (
                <MobileNavigationSheet
                    currentPath={currentPath}
                    navItems={visibleNavItems}
                    settingsItems={visibleSettingsItems}
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 shrink-0 rounded-full border border-border/70 bg-background/80 hover:bg-muted/80"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                      {isCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </TooltipContent>
                </Tooltip>
              )}

              <div className="min-w-0">
                <Breadcrumb />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-border/70 bg-background/80 hover:bg-muted/80"
                  onClick={toggle}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {mounted ? (
                  isDark ? <SunIcon /> : <MoonIcon />
                ) : (
                  <MoonIcon />
                )}
              </Button>

              <div className="flex h-10 items-center px-1">
                <div className="h-5 w-px bg-border/80" aria-hidden="true" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                      variant="ghost"
                      className="size-10 rounded-full border border-border/70 bg-background/80 p-1.5 hover:bg-muted/80 sm:h-10 sm:w-auto sm:px-1.5 sm:pr-2.5"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {userInitial}
                    </span>
                    <span className="hidden min-w-0 text-left sm:block">
                      <span className="block max-w-36 truncate text-xs font-semibold text-foreground">
                        {userDisplayName}
                      </span>
                      <span className="block max-w-36 truncate text-[0.6875rem] text-muted-foreground">
                        {session.user.email}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-72 rounded-3xl border border-border/80 bg-popover/95 p-0 shadow-xl shadow-black/5 backdrop-blur supports-backdrop-filter:bg-popover/90"
                >
                  <div className="p-2">
                    <div className="rounded-[1.25rem] border border-border/70 bg-muted/40 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/10">
                          {userInitial}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold tracking-tight text-foreground">
                            {userDisplayName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {session.user.email}
                          </p>
                        </div>
                      </div>

                      {userRoles.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {userRoles.map((role: { name: string }) => (
                            <Badge key={role.name} variant="outline" className="rounded-full bg-background/80">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                      onClick={handleSignOut}
                      variant="destructive"
                      className="mx-2 mb-2 min-h-11 cursor-pointer rounded-2xl px-3 text-sm font-medium"
                  >
                    <span className="flex size-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                      <LogOutIcon className="size-4" />
                    </span>
                    <span className="flex flex-col">
                      <span>Sign out</span>
                      <span className="text-[0.6875rem] font-normal text-muted-foreground group-focus/dropdown-menu-item:text-destructive">
                        End this session on this device
                      </span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-muted/20">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
