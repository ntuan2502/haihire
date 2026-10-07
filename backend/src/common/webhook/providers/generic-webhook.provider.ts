import crypto from "node:crypto";
import type {
  WebhookMessage,
  WebhookProvider,
  WebhookProviderConfig,
  WebhookSendResult,
} from "../webhook-provider.interface";

export class GenericWebhookProvider implements WebhookProvider {
  constructor(private readonly config: WebhookProviderConfig) {}

  async send(message: WebhookMessage): Promise<WebhookSendResult> {
    const payload = {
      eventId: message.eventId,
      eventType: message.eventType,
      source: "haihire-ats",
      title: message.title,
      severity: message.severity,
      fields: message.fields,
      timestamp: message.timestamp,
    };

    const rawBody = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.secretToken) {
      const signature = crypto
        .createHmac("sha256", this.config.secretToken)
        .update(rawBody)
        .digest("hex");
      headers["X-HaiHire-Signature"] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers,
        body: rawBody,
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
          errorMessage: `Generic webhook returned HTTP ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`,
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
        errorMessage: `Generic webhook network error: ${msg}`,
      };
    }
  }
}
