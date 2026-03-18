import { createFileRoute, useRouter } from '@tanstack/react-router';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import { BellRingIcon } from 'lucide-react';
import { z } from 'zod';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui';
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
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BellRingIcon className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Configure reusable Email and SMS templates, then map them to loan lifecycle events.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="event-mapping">Event Mapping</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <NotificationTemplatesSection />
          </TabsContent>

          <TabsContent value="event-mapping">
            <NotificationEventMappingSection />
          </TabsContent>

          <TabsContent value="history">
            <NotificationHistorySection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
