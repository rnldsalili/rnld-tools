import { Link, createFileRoute } from '@tanstack/react-router';
import { HashIcon, LayoutDashboardIcon, ShieldCheckIcon, ShuffleIcon } from 'lucide-react';
import { useSession } from '@workspace/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@workspace/ui';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [{ title: 'RTools - Dashboard' }] }),
  staticData: { title: 'Dashboard' },
  component: DashboardPage,
});

const TOOLS = [
  {
    href: '/password-generator',
    icon: ShieldCheckIcon,
    title: 'Password Generator',
    description: 'Generate strong, secure passwords with customizable options.',
  },
  {
    href: '/uuid-generator',
    icon: HashIcon,
    title: 'UUID Generator',
    description: 'Generate cryptographically random UUID v4 identifiers.',
  },
  {
    href: '/secret-generator',
    icon: ShuffleIcon,
    title: 'Secret Generator',
    description: 'Generate cryptographically secure random secrets, like openssl rand -base64 32.',
  },
] as const;

function DashboardPage() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? 'there';

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-10">
        {/* Heading */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center size-12 rounded-full bg-accent mb-2">
            <LayoutDashboardIcon className="size-5 text-accent-foreground" />
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Dashboard</p>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Welcome back{name ? `, ${name}` : ''}.
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Pick a tool below to get started.
          </p>
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} to={href}>
              <Card
                  className={cn(
                  'h-full transition-colors duration-150',
                  'hover:border-foreground/20 hover:bg-accent/40 cursor-pointer',
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-center size-9 rounded-md bg-accent mb-3">
                    <Icon className="size-4 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-sm">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
