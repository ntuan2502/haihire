import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { env } from "../../config/env";
import type {
  WebhookMessage,
  WebhookProviderConfig,
  WebhookProviderType,
} from "./webhook-provider.interface";
import { WebhookProviderFactory } from "./webhook-provider.factory";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../encryption.service";

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

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(EncryptionService)
    private readonly encryptionService?: EncryptionService,
  ) {
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
   * Non-throwing: All errors are caught and logged, never throws.
   * Priority:
   * 1. Per-organization settings (from DB) if organizationId is present.
   * 2. Global environment fallback (WEBHOOK_URL / WEBHOOK_PROVIDER).
   * 3. Warn and skip if neither is configured.
   */
  async notifyDlq(
    payload: DlqAlertPayload,
    organizationId?: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const message = this.buildDlqMessage(payload, eventId);

    // 1. Try per-organization settings from DB
    if (organizationId && this.prisma && this.encryptionService) {
      try {
        const settings = await this.prisma.db.orm.public.OrganizationWebhookSetting
          .where((s) => s.organizationId.eq(organizationId))
          .where((s) => s.eventType.eq("DLQ_ALERT"))
          .where((s) => s.isEnabled.eq(true))
          .all();

        if (settings.length > 0) {
          for (const setting of settings) {
            try {
              const decryptedUrl = this.encryptionService.decrypt(setting.webhookUrl);
              if (!decryptedUrl) {
                this.logger.error(
                  `Failed to decrypt webhook URL for setting ${setting.id}`,
                );
                continue;
              }

              const decryptedSecret = setting.secretToken
                ? this.encryptionService.decrypt(setting.secretToken) || undefined
                : undefined;

              const providerConfig: WebhookProviderConfig = {
                type: setting.provider as WebhookProviderType,
                url: decryptedUrl,
                secretToken: decryptedSecret,
                chatId: setting.chatId || undefined,
              };

              const provider = WebhookProviderFactory.create(providerConfig);
              const result = await provider.send(message);
              if (!result.success) {
                this.logger.error(
                  `Org webhook send failed for org ${organizationId} (${setting.provider}): ${result.errorMessage || "Unknown error"}`,
                );
              }
            } catch (providerErr: unknown) {
              const msg = providerErr instanceof Error ? providerErr.message : String(providerErr);
              this.logger.error(
                `Org webhook dispatch exception for provider ${setting.provider}: ${msg}`,
              );
            }
          }
          return;
        }
      } catch (dbErr: unknown) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        this.logger.error(
          `Failed to query webhook settings for org ${organizationId}: ${msg}`,
        );
      }
    }

    // 2. Fallback to global env config
    if (this.globalConfig) {
      try {
        const provider = WebhookProviderFactory.create(this.globalConfig);
        const result = await provider.send(message);
        if (!result.success) {
          this.logger.error(
            `Webhook send failed: ${result.errorMessage || "Unknown error"}`,
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Webhook notify failed: ${msg}`);
      }
      return;
    }

    // 3. No configuration found
    this.logger.warn("No webhook config available, skipping alert");
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
