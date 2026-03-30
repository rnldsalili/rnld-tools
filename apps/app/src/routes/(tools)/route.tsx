import { Outlet, createFileRoute } from '@tanstack/react-router';

import { PublicSiteHeader } from '@/app/components/public/public-site-header';
import { BasicLayout } from '@/app/layouts/basic-layout';

export const Route = createFileRoute('/(tools)')({
  component: () => (
    <BasicLayout>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute left-[-6rem] top-72 h-80 w-80 rounded-full bg-muted blur-3xl" />
          <div className="absolute right-[-5rem] top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-3rem] right-12 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.2)_26%,transparent_58%,rgba(255,255,255,0.36)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_28%,transparent_74%,rgba(255,255,255,0.04)_100%)]" />
        </div>

        <PublicSiteHeader variant="tools" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-10 sm:px-6 sm:pb-12">
          <Outlet />
        </div>
      </div>
    </BasicLayout>
  ),
});
