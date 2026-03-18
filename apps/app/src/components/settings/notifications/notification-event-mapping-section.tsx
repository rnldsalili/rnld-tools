import {
  NOTIFICATION_EMAIL_PROVIDERS,
  NOTIFICATION_EMAIL_PROVIDER_LABELS,
  NOTIFICATION_SMS_PROVIDERS,
  NOTIFICATION_SMS_PROVIDER_LABELS,
  NotificationChannel,
  NotificationEmailProvider,
} from '@workspace/constants';
import { BellRingIcon, Loader2Icon, SaveIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  FieldLabel,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@workspace/ui';
import type { NotificationSmsProvider } from '@workspace/constants';
import type {
  NotificationEventConfigItem,
  NotificationEventConfigUpdateInput,
  NotificationEventConfigsResponse,
  NotificationTemplateListItem,
} from '@/app/hooks/use-notifications';
import {
  useNotificationEventConfigs,
  useNotificationTemplates,
  useUpdateNotificationEventConfig,
} from '@/app/hooks/use-notifications';
import {
  DEFAULT_SMS_NOTIFICATION_PROVIDER,
  createEmptyNotificationProviderStatus,
} from '@/app/lib/notifications';
import {
  getNotificationChannelLabel,
  groupNotificationEventConfigs,
  isNotificationEmailProvider,
  isNotificationSmsProvider,
} from '@/app/components/settings/notifications/utils';

function NotificationEventMappingChannelCard({
  item,
  templates,
  providerStatus,
}: {
  item: NotificationEventConfigItem;
  templates: Array<NotificationTemplateListItem>;
  providerStatus: NotificationEventConfigsResponse['data']['providerStatus'];
}) {
  const { mutateAsync: updateEventConfig, isPending } = useUpdateNotificationEventConfig();
  const templatesForChannel = templates.filter((template) => template.channel === item.channel);
  const initialEmailProvider = isNotificationEmailProvider(item.config?.emailProvider)
    ? item.config.emailProvider
    : NotificationEmailProvider.BREVO;
  const initialSmsProvider = isNotificationSmsProvider(item.config?.smsProvider)
    ? item.config.smsProvider
    : DEFAULT_SMS_NOTIFICATION_PROVIDER;
  const [selectedTemplateId, setSelectedTemplateId] = useState(item.config?.templateId ?? '');
  const [isEnabled, setIsEnabled] = useState(item.config?.isEnabled ?? false);
  const [emailProvider, setEmailProvider] = useState<NotificationEmailProvider>(initialEmailProvider);
  const [smsProvider, setSmsProvider] = useState<NotificationSmsProvider>(initialSmsProvider);

  async function handleSaveConfig() {
    const payload: NotificationEventConfigUpdateInput = {
      event: item.event,
      channel: item.channel,
      templateId: selectedTemplateId,
      isEnabled,
      emailProvider: item.channel === NotificationChannel.EMAIL ? emailProvider : null,
      smsProvider: item.channel === NotificationChannel.SMS ? smsProvider : null,
    };

    try {
      await updateEventConfig(payload);
      toast.success('Notification mapping saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save notification mapping.');
    }
  }

  const isProviderConfigured = item.channel === NotificationChannel.EMAIL
    ? providerStatus.email[emailProvider].configured
    : providerStatus.sms[smsProvider].configured;

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{getNotificationChannelLabel(item.channel)}</Badge>
          <span className="text-sm text-muted-foreground">
            {item.channel === NotificationChannel.EMAIL
              ? 'Rich email template with subject line'
              : 'Plain text message for mobile delivery'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
          <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={isPending || !selectedTemplateId || !isProviderConfigured}
              onClick={() => void handleSaveConfig()}
          >
            {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Field>
          <FieldLabel>Template</FieldLabel>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={templatesForChannel.length > 0 ? 'Select template' : 'No templates available'} />
            </SelectTrigger>
            <SelectContent>
              {templatesForChannel.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {item.channel === NotificationChannel.EMAIL ? (
          <Field>
            <FieldLabel>Provider</FieldLabel>
            <Select
                value={emailProvider}
                onValueChange={(value) => {
                if (isNotificationEmailProvider(value)) {
                  setEmailProvider(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_EMAIL_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {NOTIFICATION_EMAIL_PROVIDER_LABELS[provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Field>
            <FieldLabel>Provider</FieldLabel>
            <Select
                value={smsProvider}
                onValueChange={(value) => {
                if (isNotificationSmsProvider(value)) {
                  setSmsProvider(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_SMS_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {NOTIFICATION_SMS_PROVIDER_LABELS[provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      {!isProviderConfigured ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Provider credentials are missing for this channel. Configure the Worker env secrets before enabling it.
        </p>
      ) : null}
    </div>
  );
}

function NotificationEventMappingGroup({
  eventLabel,
  emailItem,
  smsItem,
  templates,
  providerStatus,
}: {
  eventLabel: string;
  emailItem?: NotificationEventConfigItem;
  smsItem?: NotificationEventConfigItem;
  templates: Array<NotificationTemplateListItem>;
  providerStatus: NotificationEventConfigsResponse['data']['providerStatus'];
}) {
  return (
    <SectionCard>
      <SectionCardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <BellRingIcon className="size-4" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{eventLabel}</p>
            <p className="text-sm text-muted-foreground">
              Configure both delivery channels for this lifecycle event in one place.
            </p>
          </div>
        </div>
      </SectionCardHeader>
      <SectionCardContent className="pt-5">
        <div className="grid gap-4 xl:grid-cols-2">
          {emailItem ? (
            <NotificationEventMappingChannelCard
                key={[
                emailItem.event,
                emailItem.channel,
                emailItem.config?.id ?? 'new',
                emailItem.config?.templateId ?? 'none',
                emailItem.config?.emailProvider ?? 'none',
                emailItem.config?.isEnabled ? 'enabled' : 'disabled',
              ].join(':')}
                item={emailItem}
                templates={templates}
                providerStatus={providerStatus}
            />
          ) : null}

          {smsItem ? (
            <NotificationEventMappingChannelCard
                key={[
                smsItem.event,
                smsItem.channel,
                smsItem.config?.id ?? 'new',
                smsItem.config?.templateId ?? 'none',
                smsItem.config?.smsProvider ?? 'none',
                smsItem.config?.isEnabled ? 'enabled' : 'disabled',
              ].join(':')}
                item={smsItem}
                templates={templates}
                providerStatus={providerStatus}
            />
          ) : null}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
}

export function NotificationEventMappingSection() {
  const { data: templatesData } = useNotificationTemplates();
  const { data: eventConfigsData, isLoading: isEventConfigsLoading } = useNotificationEventConfigs();

  const templates = templatesData?.data.templates ?? [];
  const providerStatus = eventConfigsData?.data.providerStatus;
  const eventConfigs = eventConfigsData?.data.eventConfigs ?? [];
  const groupedEventConfigs = groupNotificationEventConfigs(eventConfigs);
  const hasMissingProviderConfig = providerStatus
    ? Object.values(providerStatus.email).some((status) => !status.configured)
      || Object.values(providerStatus.sms).some((status) => !status.configured)
    : false;

  return (
    <div className="flex flex-col gap-4">
      {hasMissingProviderConfig ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-foreground">Provider secrets are incomplete.</p>
              <p className="text-sm text-muted-foreground">
                Test sends and event mappings will remain blocked until the Worker has the required notification provider env secrets.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isEventConfigsLoading ? (
        <Card>
          <CardContent className="flex justify-center py-10">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        groupedEventConfigs.map((group) => (
          <NotificationEventMappingGroup
              key={group.event}
              eventLabel={group.eventLabel}
              emailItem={group.emailItem}
              smsItem={group.smsItem}
              templates={templates}
              providerStatus={providerStatus ?? createEmptyNotificationProviderStatus()}
          />
        ))
      )}
    </div>
  );
}
