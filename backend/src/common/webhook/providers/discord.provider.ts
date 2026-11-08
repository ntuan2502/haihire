import { postWebhook } from "../webhook-http";
import type {
  WebhookMessage,
  WebhookProvider,
  WebhookProviderConfig,
  WebhookSendResult,
} from "../webhook-provider.interface";

export class DiscordProvider implements WebhookProvider {
  constructor(private readonly config: WebhookProviderConfig) {}

  async send(message: WebhookMessage): Promise<WebhookSendResult> {
    const color =
      message.severity === "critical"
        ? 0xe74c3c
        : message.severity === "warning"
          ? 0xf39c12
          : 0x3498db;

    const shortEventId = message.eventId ? message.eventId.slice(0, 8) : "";
    const baseFooter = message.footer || "HaiHire Enterprise ATS";
    const footerText = shortEventId
      ? `${baseFooter} • Event: ${shortEventId}...`
      : baseFooter;

    const payload = {
      embeds: [
        {
          title: message.title,
          color,
          fields: message.fields.map((f) => ({
            name: f.label,
            value: f.value,
            inline: false,
          })),
          footer: { text: footerText },
          timestamp: message.timestamp,
        },
      ],
    };

    return postWebhook("DISCORD", this.config.url, JSON.stringify(payload));
  }
}
