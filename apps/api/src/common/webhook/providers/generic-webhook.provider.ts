import { postWebhook } from "../webhook-http";
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
    const headers: Record<string, string> = {};

    if (this.config.secretToken) {
      const signature = crypto
        .createHmac("sha256", this.config.secretToken)
        .update(rawBody)
        .digest("hex");
      headers["X-HaiHire-Signature"] = `sha256=${signature}`;
    }

    return postWebhook("GENERIC", this.config.url, rawBody, headers);
  }
}
