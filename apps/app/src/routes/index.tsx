import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LockIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useSession } from '@workspace/auth-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@workspace/ui';
import { BasicLayout } from '@/app/layouts/basic-layout';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'RTools' }] }),
  component: HomePage,
});

const FREE_TOOLS = [
  {
    title: 'Password Generator',
    description:
      'Generate strong, customizable passwords with control over length, character sets, and complexity.',
    icon: KeyRoundIcon,
    href: '/password-generator',
  },
  {
    title: 'UUID Generator',
    description:
      'Instantly generate one or many UUID v4 identifiers suitable for use as unique keys or tokens.',
    icon: FingerprintIcon,
    href: '/uuid-generator',
  },
  {
    title: 'Secret Generator',
    description:
      'Create cryptographically secure random secrets in base64, base64url, or hex encoding.',
    icon: ShieldCheckIcon,
    href: '/secret-generator',
  },
];

const ACCOUNT_FEATURES = [
  {
    title: 'Dashboard',
    description:
      'Your personal hub — get a quick overview of all available tools in one place after signing in.',
    icon: LayoutDashboardIcon,
    href: '/dashboard',
  },
];

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
        className={cn(
        'text-xs font-semibold uppercase tracking-widest mb-4',
        className,
      )}
    >
      {children}
    </p>
  );
}

function HomePage() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !!session?.user;

  return (
    <BasicLayout>
      <div className="min-h-screen flex flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            RTools
          </h1>
          <p className="text-muted-foreground max-w-md mb-10 leading-relaxed">
            A lightweight utility dashboard. Use the free tools right away, or
            sign in to access your personalized dashboard.
          </p>
          <div className="flex items-center gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard">
                Go to Dashboard
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!isPending && !isAuthenticated && (
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Free tools */}
        <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
          <SectionLabel className="text-muted-foreground">
            No account required
          </SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_TOOLS.map(({ title, description, icon: Icon, href }) => (
              <Link key={href} to={href} className="group">
                <Card className="h-full transition-colors group-hover:border-foreground/30">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Account features */}
        <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
          <SectionLabel className="text-muted-foreground flex items-center gap-1.5">
            <LockIcon className="h-3 w-3" />
            Requires account
          </SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACCOUNT_FEATURES.map(({ title, description, icon: Icon, href }) => (
              <Link key={href} to={href} className="group">
                <Card className="h-full transition-colors group-hover:border-foreground/30">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </BasicLayout>
  );
}
