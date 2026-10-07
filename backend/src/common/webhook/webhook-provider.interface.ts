export type WebhookProviderType = "TELEGRAM" | "DISCORD" | "GENERIC";

export interface WebhookProviderConfig {
  type: WebhookProviderType;
  url: string;           // Telegram: https://api.telegram.org/bot<TOKEN>/sendMessage
                         // Discord: https://discord.com/api/webhooks/...
                         // Generic: any valid URL
  secretToken?: string;  // For Generic HMAC-SHA256 signing (optional)
  chatId?: string;       // For Telegram (target chat_id)
}

export interface WebhookMessage {
  title: string;
  severity: "info" | "warning" | "critical";
  fields: Array<{ label: string; value: string }>;
  timestamp: string;
  footer?: string;
}

export interface WebhookSendResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
}

export interface WebhookProvider {
  send(message: WebhookMessage): Promise<WebhookSendResult>;
}
