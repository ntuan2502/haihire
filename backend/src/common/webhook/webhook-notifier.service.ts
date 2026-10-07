import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { env } from "../../config/env";
import type {
  WebhookMessage,
  WebhookProviderConfig,
} from "./webhook-provider.interface";
import { WebhookProviderFactory } from "./webhook-provider.factory";

export interface DlqAlertPayload {
  queue: string;
  jobName: string;
  objectName: string;
  reason: string;
  attemptsMade: number;
  errorMessage: string;
  timestamp: string;
}

@Injectable()
export class WebhookNotifierService {
  private readonly logger = new Logger(WebhookNotifierService.name);
  private globalConfig: WebhookProviderConfig | null;

  constructor() {
    if (env.WEBHOOK_PROVIDER && env.WEBHOOK_URL) {
      this.globalConfig = {
        type: env.WEBHOOK_PROVIDER,
        url: env.WEBHOOK_URL,
        secretToken: env.WEBHOOK_SECRET_TOKEN,
        chatId: env.WEBHOOK_CHAT_ID,
      };
    } else {
      this.globalConfig = null;
    }
  }

  /**
   * Non-throwing: mọi lỗi đều được log, KHÔNG throw.
   * Task #1B sẽ thay đổi method này để load config per-org.
   */
  async notifyDlq(payload: DlqAlertPayload): Promise<void> {
    if (!this.globalConfig) {
      this.logger.warn("No webhook config available, skipping alert");
      return;
    }

    try {
      const provider = WebhookProviderFactory.create(this.globalConfig);
      const eventId = randomUUID();
      const message = this.buildDlqMessage(payload, eventId);
      const result = await provider.send(message);
      if (!result.success) {
        this.logger.error(`Webhook send failed: ${result.errorMessage || "Unknown error"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook notify failed: ${msg}`);
    }
  }

  buildDlqMessage(payload: DlqAlertPayload, eventId: string = randomUUID()): WebhookMessage {
    return {
      eventId,
      eventType: "DLQ_ALERT",
      title: "🚨 HaiHire DLQ Alert",
      severity: payload.attemptsMade >= 5 ? "critical" : "warning",
      fields: [
        { label: "Queue", value: payload.queue },
        { label: "Job", value: payload.jobName },
        { label: "Object", value: payload.objectName },
        { label: "Reason", value: payload.reason },
        { label: "Attempts", value: String(payload.attemptsMade) },
        { label: "Error", value: payload.errorMessage.slice(0, 500) },
      ],
      timestamp: payload.timestamp,
      footer: "HaiHire Enterprise ATS",
    };
  }
}
