import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui';

import { ToolIconBadge } from '@/app/components/tools/tool-icon-badge';
import { PUBLIC_TOOLS } from '@/app/constants/public-tools';
import { useTheme } from '@/app/hooks/use-theme';
import { BasicLayout } from '@/app/layouts/basic-layout';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'RTools' }] }),
  component: HomePage,
});

const FOOTER_LINKS = [
  { label: 'Tools', href: '#tools' },
];

function HomePage() {
  const { isDark, mounted, toggle } = useTheme();

  return (
    <BasicLayout>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute left-[-6rem] top-72 h-80 w-80 rounded-full bg-muted blur-3xl" />
          <div className="absolute right-[-5rem] top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-3rem] right-12 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.2)_26%,transparent_58%,rgba(255,255,255,0.36)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_28%,transparent_74%,rgba(255,255,255,0.04)_100%)]" />
        </div>

        <header className="sticky top-0 z-20 w-full border-b border-border/70 bg-background/82 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-3.5">
              <Link
                  to="/"
                  className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-border/70 bg-background/70 px-2 py-1.5 transition-colors hover:bg-background"
              >
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm">
                  <img
                      src="/web-app-manifest-512x512.png"
                      alt="RTools logo"
                      className="size-full object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    RTools
                  </span>
                  <span className="block truncate text-xs text-foreground sm:text-sm">
                    Secure everyday utilities
                  </span>
                </span>
              </Link>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <Button asChild variant="outline" className="h-9 rounded-full px-4">
                  <Link to="/login">Login</Link>
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full border border-border/70 bg-background/80 hover:bg-muted/80"
                    onClick={toggle}
                    aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Toggle theme'}
                >
                  {mounted ? (
                    isDark ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />
                  ) : (
                    <MoonIcon className="size-4.5" />
                  )}
                </Button>
              </div>
          </div>
        </header>

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 sm:px-6 sm:pb-10">
          <main className="flex flex-1 flex-col gap-8 pt-2 sm:gap-10 sm:pt-4">
            <section
                id="tools"
                className="relative scroll-mt-24 overflow-hidden rounded-[2rem] border border-border/80 bg-background/90 shadow-[0_34px_100px_-56px_rgba(15,23,42,0.34)] backdrop-blur-xl sm:scroll-mt-28 dark:shadow-[0_34px_100px_-56px_rgba(0,0,0,0.68)]"
            >
              <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.16),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(255,255,255,0.18))] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.12),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]"
              />

              <div className="relative grid gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.95fr)] lg:px-8 lg:py-8">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      Secure generators and working calculations in one place.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.65rem] lg:leading-[1.02]">
                      One place for the utility work teams do every day.
                    </h1>
                    <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                      RTools brings together the small but essential workflows that keep delivery
                      moving: generating secure values, creating identifiers, and running clear loan
                      estimates without switching between throwaway tools.
                    </p>
                  </div>

                  <div className="grid gap-3 pt-1 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-background/68 px-4 py-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Direct use
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        Open the tool, complete the task, and move on.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/68 px-4 py-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Clean output
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        Results are structured for copy, review, and handoff.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/68 px-4 py-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Reliable scope
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        A compact set of utilities with practical defaults.
                      </p>
                    </div>
                  </div>
                </div>

                <Card className="overflow-hidden border border-border/70 bg-background/82 py-0 shadow-[0_22px_48px_-32px_rgba(15,23,42,0.32)] backdrop-blur-sm">
                  <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/55 to-transparent"
                  />
                  <CardHeader className="relative gap-2 border-b border-border/60 px-5 pt-5 pb-4">
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Built for recurring utility work
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-muted-foreground">
                      The public surface keeps the most useful workflows close at hand.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative space-y-3 px-5 pt-4 pb-5">
                    {PUBLIC_TOOLS.map(({ title, href, icon, benefit }) => (
                      <Link
                          key={href}
                          to={href}
                          className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-background/68 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-background"
                      >
                        <ToolIconBadge icon={icon} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-foreground">{title}</span>
                            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                            {benefit}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </section>

          </main>

        </div>

        <footer className="w-full border-t border-border/70 bg-background/82 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                  <img
                      src="/web-app-manifest-512x512.png"
                      alt="RTools logo"
                      className="size-full object-cover"
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    RTools
                  </p>
                  <p className="text-base font-medium text-foreground">
                    Secure everyday utilities in one place.
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Public tools for secure values, identifiers, and working calculations. Clear
                workflows, dependable output, and less tool switching.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FOOTER_LINKS.map((item) => (
                <Button key={item.href} asChild variant="ghost" className="rounded-full">
                  <a href={item.href}>{item.label}</a>
                </Button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </BasicLayout>
  );
}
