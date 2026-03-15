import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Provider as JotaiProvider, useAtomValue  } from 'jotai';
import { Button, Toaster } from '@workspace/ui';
import type { QueryClient } from '@tanstack/react-query';

import { themeAtom } from '@/app/stores/theme';
import appCss from '@/app/styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'RTools',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'shortcut icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: RootNotFound,
});

function ThemedToaster() {
  const theme = useAtomValue(themeAtom);
  return <Toaster theme={theme} />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <JotaiProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ThemedToaster />
            {import.meta.env.DEV && (
              <TanStackDevtools
                  config={{
                  position: 'bottom-right',
                }}
                  plugins={[
                  {
                    name: 'TanStack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                  {
                    name: 'TanStack Query',
                    render: <ReactQueryDevtoolsPanel />,
                  },
                ]}
              />
            )}
          </QueryClientProvider>
        </JotaiProvider>
        <Scripts />
      </body>
    </html>
  );
}

export function RootNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The page you requested does not exist or is no longer available.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Open Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
