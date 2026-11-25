import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  type WebhookEventType,
  type WebhookProviderType,
  type WebhookSettingResponse,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/encryption.service";
import { toTimestamp, toInstant } from "../common/date.util";
import { CreateWebhookSettingDto } from "./dto/create-webhook-setting.dto";
import { UpdateWebhookSettingDto } from "./dto/update-webhook-setting.dto";
import { TestWebhookSettingDto } from "./dto/test-webhook-setting.dto";
import {
  maskWebhookUrl,
  validateWebhookProviderConfig,
} from "./webhook-settings.validator";
import { WebhookProviderFactory } from "../common/webhook/webhook-provider.factory";
import type { WebhookMessage } from "../common/webhook/webhook-provider.interface";
import { EventsService } from "../events/events.service";
import { computeAuditDiff } from "../common/audit-diff.util";
import { OrganizationsAuditLogService } from "../organizations/services/organizations-audit-log.service";

@Injectable()
export class WebhookSettingsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
  ) {}

  private mapToResponse(item: {
    id: string;
    organizationId: string;
    eventType: string;
    provider: string;
    webhookUrl: string;
    secretToken: string | null;
    chatId: string | null;
    isEnabled: boolean;
    createdAt: unknown;
    updatedAt: unknown;
    createdBy: string | null;
    updatedBy: string | null;
  }): WebhookSettingResponse {
    let plainUrl = "";
    try {
      plainUrl = this.encryptionService.decrypt(item.webhookUrl) || "";
    } catch {
      plainUrl = item.webhookUrl;
    }

    const maskedUrl = maskWebhookUrl(
      plainUrl,
      item.provider as WebhookProviderType,
    );
    const maskedSecret = item.secretToken ? "••••••••••••••••" : null;

    return {
      id: item.id,
      organizationId: item.organizationId,
      eventType: item.eventType as WebhookEventType,
      provider: item.provider as WebhookProviderType,
      webhookUrl: maskedUrl,
      secretToken: maskedSecret,
      chatId: item.chatId,
      isEnabled: Boolean(item.isEnabled),
      createdAt: new Date(toTimestamp(item.createdAt)).toISOString(),
      updatedAt: new Date(toTimestamp(item.updatedAt)).toISOString(),
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
    };
  }

  async findAll(organizationId: string): Promise<WebhookSettingResponse[]> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Organization ID is required",
      );
    }

    const settings = await this.prisma.organizationWebhookSetting.findMany({
      where: { organizationId },
    });

    return settings.map((s) => this.mapToResponse(s));
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<WebhookSettingResponse> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Organization ID is required",
      );
    }

    const setting = await this.prisma.organizationWebhookSetting.findFirst({
      where: { id },
    });

    if (!setting) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.WEBHOOK_SETTING_NOT_FOUND,
        `Webhook setting with ID ${id} not found`,
      );
    }

    if (setting.organizationId !== organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: setting belongs to another organization",
        { organizationId },
      );
    }

    return this.mapToResponse(setting);
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateWebhookSettingDto,
  ): Promise<WebhookSettingResponse> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Organization ID is required",
      );
    }

    const validationError = validateWebhookProviderConfig(
      dto.provider,
      dto.webhookUrl,
      dto.chatId,
      dto.secretToken,
    );
    if (validationError) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.WEBHOOK_PROVIDER_MISMATCH,
        validationError,
      );
    }

    // Check unique constraint [organizationId, eventType, provider]
    const existing = await this.prisma.organizationWebhookSetting.findFirst({
      where: {
        organizationId,
        eventType: dto.eventType,
        provider: dto.provider,
      },
    });

    if (existing) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `A webhook setting for event '${dto.eventType}' with provider '${dto.provider}' already exists in this organization.`,
      );
    }

    const encryptedUrl = this.encryptionService.encrypt(dto.webhookUrl.trim());
    if (!encryptedUrl) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Failed to encrypt webhook URL",
      );
    }

    const encryptedSecret = dto.secretToken?.trim()
      ? this.encryptionService.encrypt(dto.secretToken.trim())
      : null;

    const setting = await this.prisma.organizationWebhookSetting.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        eventType: dto.eventType,
        provider: dto.provider,
        webhookUrl: encryptedUrl,
        secretToken: encryptedSecret,
        chatId: dto.chatId?.trim() || null,
        isEnabled: dto.isEnabled ?? true,
        createdAt: toInstant(),
        updatedAt: toInstant(),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.auditLog?.logOrg(
      organizationId,
      userId,
      "WEBHOOK_CREATED",
      "WEBHOOK",
      {
        webhookId: setting.id,
        provider: setting.provider,
        eventType: setting.eventType,
      },
      undefined,
      {
        targetId: setting.id,
        targetLabel: `${setting.provider} (${setting.eventType})`,
        changes: [
          { field: "provider", before: null, after: setting.provider },
          { field: "eventType", before: null, after: setting.eventType },
          {
            field: "isEnabled",
            before: null,
            after: Boolean(setting.isEnabled),
          },
          ...(encryptedSecret
            ? [{ field: "secretToken", before: null, after: "[REDACTED]" }]
            : []),
        ],
      },
    );

    this.eventsService?.emit({
      type: "WEBHOOKS_CHANGED",
      organizationId,
      data: { webhookId: setting.id },
    });
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId,
    });

    return this.mapToResponse(setting);
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateWebhookSettingDto,
  ): Promise<WebhookSettingResponse> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Organization ID is required",
      );
    }

    const existing = await this.prisma.organizationWebhookSetting.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.WEBHOOK_SETTING_NOT_FOUND,
        `Webhook setting with ID ${id} not found`,
      );
    }

    if (existing.organizationId !== organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: setting belongs to another organization",
        { organizationId },
      );
    }

    const targetEventType =
      dto.eventType || (existing.eventType as WebhookEventType);
    const targetProvider =
      dto.provider || (existing.provider as WebhookProviderType);
    const targetChatId =
      dto.chatId !== undefined ? dto.chatId?.trim() || null : existing.chatId;

    // Check unique conflict if eventType or provider changed
    if (
      (dto.eventType && dto.eventType !== existing.eventType) ||
      (dto.provider && dto.provider !== existing.provider)
    ) {
      const conflict = await this.prisma.organizationWebhookSetting.findFirst({
        where: {
          organizationId,
          eventType: targetEventType,
          provider: targetProvider,
        },
      });

      if (conflict && conflict.id !== id) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          `A webhook setting for event '${targetEventType}' with provider '${targetProvider}' already exists in this organization.`,
        );
      }
    }

    interface WebhookUpdatePayload {
      eventType?: WebhookEventType;
      provider?: WebhookProviderType;
      webhookUrl?: string;
      secretToken?: string | null;
      chatId?: string | null;
      isEnabled?: boolean;
      updatedBy?: string;
      updatedAt: Date;
    }

    const updatePayload: WebhookUpdatePayload = {
      updatedBy: userId,
      updatedAt: toInstant(),
    };

    if (dto.eventType) updatePayload.eventType = dto.eventType;
    if (dto.provider) updatePayload.provider = dto.provider;
    if (dto.chatId !== undefined) updatePayload.chatId = targetChatId;
    if (dto.isEnabled !== undefined) updatePayload.isEnabled = dto.isEnabled;

    // Handle webhookUrl update
    if (dto.webhookUrl !== undefined) {
      const trimmedUrl = dto.webhookUrl.trim();
      if (trimmedUrl.includes("***")) {
        // Keep existing encrypted URL unchanged
      } else {
        const validationError = validateWebhookProviderConfig(
          targetProvider,
          trimmedUrl,
          targetChatId,
          dto.secretToken,
        );
        if (validationError) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.WEBHOOK_PROVIDER_MISMATCH,
            validationError,
          );
        }
        const encrypted = this.encryptionService.encrypt(trimmedUrl);
        if (encrypted) {
          updatePayload.webhookUrl = encrypted;
        }
      }
    } else if (dto.provider && dto.provider !== existing.provider) {
      // Re-validate existing URL with new provider
      let rawUrl = "";
      try {
        rawUrl = this.encryptionService.decrypt(existing.webhookUrl) || "";
      } catch {
        rawUrl = existing.webhookUrl;
      }
      const validationError = validateWebhookProviderConfig(
        targetProvider,
        rawUrl,
        targetChatId,
        dto.secretToken,
      );
      if (validationError) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.WEBHOOK_PROVIDER_MISMATCH,
          validationError,
        );
      }
    }

    // Handle secretToken update
    if (dto.secretToken !== undefined) {
      const trimmedSecret = dto.secretToken.trim();
      if (trimmedSecret.startsWith("•")) {
        // Keep existing secretToken unchanged
      } else if (!trimmedSecret) {
        updatePayload.secretToken = null;
      } else {
        updatePayload.secretToken =
          this.encryptionService.encrypt(trimmedSecret);
      }
    }

    const updated = await this.prisma.organizationWebhookSetting.update({
      where: { id },
      data: updatePayload,
    });

    if (!updated) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.WEBHOOK_SETTING_NOT_FOUND,
        `Webhook setting with ID ${id} not found`,
      );
    }

    const beforeAudit: Record<string, unknown> = {
      eventType: existing.eventType,
      provider: existing.provider,
      chatId: existing.chatId ?? null,
      isEnabled: Boolean(existing.isEnabled),
    };
    const afterAudit: Record<string, unknown> = {
      eventType: updated.eventType,
      provider: updated.provider,
      chatId: updated.chatId ?? null,
      isEnabled: Boolean(updated.isEnabled),
    };
    if (updatePayload.webhookUrl !== undefined) {
      beforeAudit.webhookUrl = maskWebhookUrl(
        (() => {
          try {
            return this.encryptionService.decrypt(existing.webhookUrl) || "";
          } catch {
            return existing.webhookUrl;
          }
        })(),
        existing.provider as WebhookProviderType,
      );
      afterAudit.webhookUrl = this.mapToResponse(updated).webhookUrl;
    }
    if (updatePayload.secretToken !== undefined) {
      beforeAudit.secretToken = existing.secretToken ?? null;
      afterAudit.secretToken = updated.secretToken ?? null;
    }

    const webhookChanges = computeAuditDiff(beforeAudit, afterAudit, {
      redactFields: ["secretToken"],
    });

    await this.auditLog?.logOrg(
      organizationId,
      userId,
      "WEBHOOK_UPDATED",
      "WEBHOOK",
      {
        webhookId: updated.id,
        provider: updated.provider,
        eventType: updated.eventType,
      },
      undefined,
      {
        targetId: updated.id,
        targetLabel: `${updated.provider} (${updated.eventType})`,
        changes: webhookChanges.length > 0 ? webhookChanges : null,
      },
    );

    this.eventsService?.emit({
      type: "WEBHOOKS_CHANGED",
      organizationId,
      data: { webhookId: updated.id },
    });
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId,
    });

    return this.mapToResponse(updated);
  }

  async delete(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<{ success: boolean }> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Organization ID is required",
      );
    }

    const existing = await this.prisma.organizationWebhookSetting.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.WEBHOOK_SETTING_NOT_FOUND,
        `Webhook setting with ID ${id} not found`,
      );
    }

    if (existing.organizationId !== organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: setting belongs to another organization",
        { organizationId },
      );
    }

    await this.prisma.organizationWebhookSetting.delete({
      where: { id },
    });

    await this.auditLog?.logOrg(
      organizationId,
      userId || null,
      "WEBHOOK_DELETED",
      "WEBHOOK",
      {
        webhookId: id,
        provider: existing.provider,
        eventType: existing.eventType,
      },
      undefined,
      {
        targetId: id,
        targetLabel: `${existing.provider} (${existing.eventType})`,
        changes: [
          { field: "provider", before: existing.provider, after: null },
          { field: "eventType", before: existing.eventType, after: null },
          {
            field: "isEnabled",
            before: Boolean(existing.isEnabled),
            after: null,
          },
        ],
      },
    );

    this.eventsService?.emit({
      type: "WEBHOOKS_CHANGED",
      organizationId,
      data: { webhookId: id },
    });
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId,
    });

    return { success: true };
  }

  async testConnection(
    organizationId: string,
    dto: TestWebhookSettingDto,
  ): Promise<{ success: boolean; message: string }> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Organization ID is required",
      );
    }

    let urlToUse: string;
    let providerToUse: WebhookProviderType;
    let chatIdToUse: string | undefined;
    let secretTokenToUse: string | undefined;
    let eventTypeToUse: WebhookEventType = dto.eventType || "DLQ_ALERT";

    if (dto.id && (!dto.webhookUrl || dto.webhookUrl.includes("***"))) {
      const settingId = dto.id;
      // Test existing setting from database
      const existing = await this.prisma.organizationWebhookSetting.findFirst({
        where: { id: settingId },
      });

      if (!existing) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.WEBHOOK_SETTING_NOT_FOUND,
          `Webhook setting with ID ${dto.id} not found`,
        );
      }

      if (existing.organizationId !== organizationId) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Access denied: setting belongs to another organization",
        );
      }

      const decryptedUrl = this.encryptionService.decrypt(existing.webhookUrl);
      if (!decryptedUrl) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.WEBHOOK_TEST_FAILED,
          "Failed to decrypt stored webhook URL",
        );
      }

      urlToUse = decryptedUrl;
      providerToUse = existing.provider as WebhookProviderType;
      chatIdToUse = existing.chatId || undefined;
      secretTokenToUse = existing.secretToken
        ? this.encryptionService.decrypt(existing.secretToken) || undefined
        : undefined;
      eventTypeToUse =
        (existing.eventType as WebhookEventType) || eventTypeToUse;
    } else {
      // Test ad-hoc configuration
      if (!dto.provider || !dto.webhookUrl) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "provider and webhookUrl are required to test connection",
        );
      }

      const validationError = validateWebhookProviderConfig(
        dto.provider,
        dto.webhookUrl,
        dto.chatId,
        dto.secretToken,
      );
      if (validationError) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.WEBHOOK_PROVIDER_MISMATCH,
          validationError,
        );
      }

      urlToUse = dto.webhookUrl.trim();
      providerToUse = dto.provider;
      chatIdToUse = dto.chatId?.trim() || undefined;
      secretTokenToUse = dto.secretToken?.trim() || undefined;
    }

    try {
      const provider = WebhookProviderFactory.create({
        type: providerToUse,
        url: urlToUse,
        chatId: chatIdToUse,
        secretToken: secretTokenToUse,
      });

      const testMessage: WebhookMessage = {
        eventId: crypto.randomUUID(),
        eventType: eventTypeToUse,
        title: "🔔 HaiHire Webhook Test",
        severity: "info",
        fields: [
          { label: "Provider", value: providerToUse },
          { label: "Event Type", value: eventTypeToUse },
          { label: "Status", value: "Connection verified successfully" },
        ],
        timestamp: new Date().toISOString(),
        footer: "HaiHire Enterprise ATS — Test Connection",
      };

      const result = await provider.send(testMessage);
      if (!result.success) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.WEBHOOK_TEST_FAILED,
          result.errorMessage || "Failed to send test webhook",
        );
      }

      return {
        success: true,
        message: "Webhook test sent successfully",
      };
    } catch (err: unknown) {
      if (err instanceof AppBadRequestException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new AppBadRequestException(
        APP_ERROR_CODES.WEBHOOK_TEST_FAILED,
        `Webhook test failed: ${msg}`,
      );
    }
  }
}
