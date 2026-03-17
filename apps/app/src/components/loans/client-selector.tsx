import { ClientStatus } from '@workspace/constants';
import {
  Combobox,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@workspace/ui';
import type { ClientListItem } from '@/app/hooks/use-client';
import {  useEnabledClients } from '@/app/hooks/use-client';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { toFieldErrors } from '@/app/lib/form';

interface ClientSelectorProps {
  clientId: string;
  currentClient?: {
    address: string | null;
    email: string | null;
    id: string;
    name: string;
    phone: string | null;
    status: ClientStatus;
  } | null;
  errors: Array<unknown>;
  label?: string;
  onChange: (value: string) => void;
}

export function ClientSelector({
  clientId,
  currentClient,
  errors,
  label = 'Client',
  onChange,
}: ClientSelectorProps) {
  const { data, isLoading } = useEnabledClients();

  const enabledClients = data?.data.clients ?? [];
  const selectedClient = getSelectedClient(enabledClients, currentClient, clientId);
  const comboboxOptions = buildClientOptions(enabledClients, currentClient);
  const hasEnabledClients = enabledClients.length > 0;

  return (
    <Field data-invalid={errors.length > 0 || undefined}>
      <FieldLabel htmlFor="loan-client-selector">
        {label} <span className="text-destructive">*</span>
      </FieldLabel>
      <Combobox
          aria-invalid={errors.length > 0}
          id="loan-client-selector"
          value={clientId}
          onValueChange={onChange}
          options={comboboxOptions}
          placeholder={isLoading ? 'Loading clients...' : 'Select a client'}
          searchPlaceholder="Search clients..."
          emptyText="No matching clients found."
          disabled={isLoading || !hasEnabledClients}
      />
      <FieldError errors={toFieldErrors(errors)} />
      {!hasEnabledClients && (
        <FieldDescription>No enabled clients available. Create one first from the Clients page.</FieldDescription>
      )}
      {selectedClient && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{selectedClient.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedClient.email ?? 'No email'} • {selectedClient.phone ?? 'No phone'}
              </p>
            </div>
            <div className="shrink-0">
              <ClientStatusBadge status={selectedClient.status} />
            </div>
          </div>
          {selectedClient.address && (
            <p className="mt-2 text-xs text-muted-foreground">{selectedClient.address}</p>
          )}
          {selectedClient.status === ClientStatus.DISABLED && (
            <FieldDescription className="mt-2">
              Disabled clients remain linked to existing loans but cannot be selected for new ones.
            </FieldDescription>
          )}
        </div>
      )}
    </Field>
  );
}

function buildClientOptions(
  enabledClients: Array<ClientListItem>,
  currentClient?: ClientSelectorProps['currentClient'],
) {
  const options = enabledClients.map((client) => ({
    keywords: [client.email ?? '', client.phone ?? '', client.address ?? ''],
    label: client.name,
    value: client.id,
  }));

  if (
    currentClient
    && currentClient.status === ClientStatus.DISABLED
    && !options.some((option) => option.value === currentClient.id)
  ) {
    options.unshift({
      keywords: [currentClient.email ?? '', currentClient.phone ?? '', currentClient.address ?? 'disabled'],
      label: `${currentClient.name} (Disabled)`,
      value: currentClient.id,
    });
  }

  return options;
}

function getSelectedClient(
  enabledClients: Array<ClientListItem>,
  currentClient: ClientSelectorProps['currentClient'],
  clientId: string,
) {
  if (currentClient && currentClient.id === clientId) {
    return currentClient;
  }

  return enabledClients.find((client) => client.id === clientId) ?? null;
}
