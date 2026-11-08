import { postWebhook } from "../webhook-http";
import type {
  WebhookMessage,
  WebhookProvider,
  WebhookProviderConfig,
  WebhookSendResult,
} from "../webhook-provider.interface";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export class TelegramProvider implements WebhookProvider {
  constructor(private readonly config: WebhookProviderConfig) {}

  async send(message: WebhookMessage): Promise<WebhookSendResult> {
    const lines: string[] = [
      `<b>${escapeHtml(message.title)}</b>`,
      `<b>Severity:</b> ${escapeHtml(message.severity.toUpperCase())}`,
      "",
      ...message.fields.map(
        (f) => `<b>${escapeHtml(f.label)}:</b> ${escapeHtml(f.value)}`,
      ),
    ];

    if (message.footer) {
      lines.push("", `<i>${escapeHtml(message.footer)}</i>`);
    }

    if (message.eventId) {
      const shortId = message.eventId.slice(0, 8);
      lines.push(`Event: ${escapeHtml(shortId)}...`);
    }

    const payload = {
      chat_id: this.config.chatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    return postWebhook("TELEGRAM", this.config.url, JSON.stringify(payload));
  }
}
