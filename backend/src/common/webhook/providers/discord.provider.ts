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
          footer: { text: message.footer || "HaiHire Enterprise ATS" },
          timestamp: message.timestamp,
        },
      ],
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
          errorMessage: `Discord webhook returned HTTP ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`,
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
        errorMessage: `Discord network error: ${msg}`,
      };
    }
  }
}
