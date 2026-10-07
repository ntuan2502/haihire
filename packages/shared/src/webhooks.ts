export const WEBHOOK_EVENT_TYPES = [
  "DLQ_ALERT",
  "ORPHAN_SPIKE",
  "JOB_POSTED",
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const WEBHOOK_PROVIDER_TYPES = [
  "TELEGRAM",
  "DISCORD",
  "GENERIC",
] as const;
export type WebhookProviderType = (typeof WEBHOOK_PROVIDER_TYPES)[number];

export interface WebhookSettingResponse {
  id: string;
  organizationId: string;
  eventType: WebhookEventType;
  provider: WebhookProviderType;
  webhookUrl: string;
  secretToken: string | null;
  chatId: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}
