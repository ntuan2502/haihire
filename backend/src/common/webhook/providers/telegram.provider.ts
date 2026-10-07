import type {
  WebhookMessage,
  WebhookProvider,
  WebhookProviderConfig,
  WebhookSendResult,
} from "../webhook-provider.interface";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

    const payload = {
      chat_id: this.config.chatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          errorDetails = await response.text();
        } catch {
          // Ignore response read error
        }
        return {
          success: false,
          statusCode: response.status,
          errorMessage: `Telegram API returned HTTP ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`,
        };
      }

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errorMessage: `Telegram network error: ${msg}`,
      };
    }
  }
}
