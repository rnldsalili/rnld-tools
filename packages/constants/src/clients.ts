export enum ClientStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export const CLIENT_STATUSES = [
  ClientStatus.ENABLED,
  ClientStatus.DISABLED,
] as const;

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  [ClientStatus.ENABLED]: 'Enabled',
  [ClientStatus.DISABLED]: 'Disabled',
};

export const CLIENTS_LIMIT = 10;
