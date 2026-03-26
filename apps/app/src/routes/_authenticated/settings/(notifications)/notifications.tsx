import { createFileRoute, useRouter } from '@tanstack/react-router';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import { BellRingIcon } from 'lucide-react';
import { z } from 'zod';
import { HorizontalTabs } from '@workspace/ui';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { NotificationEventMappingSection } from '@/app/components/settings/notifications/notification-event-mapping-section';
import { NotificationHistorySection } from '@/app/components/settings/notifications/notification-history-section';
import { NotificationTemplatesSection } from '@/app/components/settings/notifications/notification-templates-section';
import { isOneOf } from '@/app/lib/value-guards';

const NOTIFICATION_SETTINGS_TABS = ['templates', 'event-mapping', 'history'] as const;

type NotificationSettingsTab = typeof NOTIFICATION_SETTINGS_TABS[number];

function isNotificationSettingsTab(value: unknown): value is NotificationSettingsTab {
  return isOneOf(NOTIFICATION_SETTINGS_TABS, value);
}

export const Route = createFileRoute('/_authenticated/settings/(notifications)/notifications')({
  head: () => ({ meta: [{ title: 'RTools - Notifications' }] }),
  staticData: { title: 'Notifications' },
  validateSearch: z.object({
    tab: z.enum(NOTIFICATION_SETTINGS_TABS).optional(),
  }),
  component: NotificationSettingsPage,
});

function NotificationSettingsPage() {
  const router = useRouter();
  const { tab = 'templates' } = Route.useSearch();
  const canViewNotifications = useCan(PermissionModule.NOTIFICATIONS, PermissionAction.VIEW);

  if (!canViewNotifications) {
    return (
      <UnauthorizedState
          title="Notifications Restricted"
          description="You do not have permission to view notification settings."
      />
    );
  }

  function handleTabChange(nextTab: string) {
    if (!isNotificationSettingsTab(nextTab)) {
      return;
    }

    void router.navigate({
      to: Route.to,
      search: (previousSearch) => ({
        ...previousSearch,
        tab: nextTab,
      }),
      replace: true,
    });
  }

  return (
    <div className="min-h-full bg-muted/[0.18]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-5">
        <section className="overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-sm shadow-black/[0.03]">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 text-primary shadow-sm shadow-primary/5">
                <BellRingIcon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Notifications</h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Configure reusable Email and SMS templates, then map them to loan lifecycle events.
                </p>
              </div>
            </div>

            <HorizontalTabs
                value={tab}
                onValueChange={handleTabChange}
                className="min-w-0"
                listClassName="-mx-1 px-1 sm:mx-0 sm:px-0"
                contentClassName="border-t border-border/70 pt-4 sm:pt-5"
                items={[
                {
                  value: 'templates',
                  label: 'Templates',
                  content: <NotificationTemplatesSection />,
                },
                {
                  value: 'event-mapping',
                  label: 'Event Mapping',
                  content: <NotificationEventMappingSection />,
                },
                {
                  value: 'history',
                  label: 'History',
                  content: <NotificationHistorySection />,
                },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
