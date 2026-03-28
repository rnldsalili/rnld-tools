import { createFileRoute, useRouter } from '@tanstack/react-router';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import { BellRingIcon } from 'lucide-react';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
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
    <Tabs value={tab} onValueChange={handleTabChange} className="min-w-0">
      <AuthenticatedListPageShell
          icon={BellRingIcon}
          title="Notifications"
          description="Configure reusable Email and SMS templates, then map them to loan lifecycle events."
          controls={(
          <TabsList className="-mx-1 flex w-full max-w-full justify-start gap-1 overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:w-fit sm:justify-center sm:px-0">
            <TabsTrigger value="templates" className="shrink-0 px-3 py-1.5 text-sm">
              Templates
            </TabsTrigger>
            <TabsTrigger value="event-mapping" className="shrink-0 px-3 py-1.5 text-sm">
              Event Mapping
            </TabsTrigger>
            <TabsTrigger value="history" className="shrink-0 px-3 py-1.5 text-sm">
              History
            </TabsTrigger>
          </TabsList>
        )}
      >
        <TabsContent value="templates" className="mt-0 min-w-0 px-4 py-4 sm:px-5 sm:py-5">
          <NotificationTemplatesSection />
        </TabsContent>
        <TabsContent value="event-mapping" className="mt-0 min-w-0 px-4 py-4 sm:px-5 sm:py-5">
          <NotificationEventMappingSection />
        </TabsContent>
        <TabsContent value="history" className="mt-0 min-w-0 px-4 py-4 sm:px-5 sm:py-5">
          <NotificationHistorySection />
        </TabsContent>
      </AuthenticatedListPageShell>
    </Tabs>
  );
}
