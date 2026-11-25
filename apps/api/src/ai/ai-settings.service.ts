import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  type AiProvider,
  type OrganizationAiSettingResponse,
  type OrganizationAiStatusResponse,
  type TestAiConnectionInput,
  type TestAiConnectionResponse,
  type UpsertAiSettingInput,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
} from "../common/app-exception";
import { toTimestamp } from "../common/date.util";
import { EncryptionService } from "../common/encryption.service";
import { OrganizationsAuditLogService } from "../organizations/services/organizations-audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  assertSafeAiEndpointUrl,
  callAiCompletion,
} from "./ai-provider.client";

export interface ActiveAiRuntimeConfig {
  provider: AiProvider;
  modelId: string;
  apiKey: string | null;
  baseUrl: string | null;
}

@Injectable()
export class AiSettingsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
  ) {}

  private requireOrgId(organizationId?: string | null): string {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Active organization context is required.",
      );
    }
    return organizationId;
  }

  private mapToResponse(row: {
    id: string;
    organizationId: string;
    provider: string;
    modelId: string;
    encryptedApiKey: string | null;
    apiKeyLast4: string | null;
    baseUrl: string | null;
    isEnabled: boolean;
    createdAt: unknown;
    updatedAt: unknown;
  }): OrganizationAiSettingResponse {
    return {
      id: row.id,
      organizationId: row.organizationId,
      provider: row.provider as AiProvider,
      modelId: row.modelId,
      baseUrl: row.baseUrl ?? null,
      hasApiKey: Boolean(row.encryptedApiKey),
      apiKeyLast4: row.apiKeyLast4 ?? null,
      isEnabled: Boolean(row.isEnabled),
      createdAt: new Date(toTimestamp(row.createdAt)).toISOString(),
      updatedAt: new Date(toTimestamp(row.updatedAt)).toISOString(),
    };
  }

  async getStatus(
    organizationId?: string | null,
  ): Promise<OrganizationAiStatusResponse> {
    const orgId = this.requireOrgId(organizationId);
    const existing = await this.prisma.organizationAiSetting.findFirst({
      where: { organizationId: orgId },
      select: {
        provider: true,
        modelId: true,
        encryptedApiKey: true,
        isEnabled: true,
      },
    });

    if (!existing) {
      return { configured: false, enabled: false };
    }

    const needsKey = existing.provider !== "OPENAI_COMPATIBLE";
    const configured = !needsKey || Boolean(existing.encryptedApiKey);

    return {
      configured,
      enabled: Boolean(existing.isEnabled) && configured,
      provider: existing.provider as AiProvider,
      modelId: existing.modelId,
    };
  }

  async getSetting(
    organizationId?: string | null,
  ): Promise<OrganizationAiSettingResponse | null> {
    const orgId = this.requireOrgId(organizationId);
    const row = await this.prisma.organizationAiSetting.findFirst({
      where: { organizationId: orgId },
    });
    return row ? this.mapToResponse(row) : null;
  }

  async upsertSetting(
    organizationId: string,
    actorId: string | undefined,
    dto: UpsertAiSettingInput,
  ): Promise<OrganizationAiSettingResponse> {
    const orgId = this.requireOrgId(organizationId);
    if (dto.baseUrl) {
      assertSafeAiEndpointUrl(dto.baseUrl);
    }

    const existing = await this.prisma.organizationAiSetting.findFirst({
      where: { organizationId: orgId },
    });

    const trimmedNewKey = dto.apiKey?.trim() || "";
    let encryptedApiKey = existing?.encryptedApiKey ?? null;
    let apiKeyLast4 = existing?.apiKeyLast4 ?? null;

    if (trimmedNewKey) {
      encryptedApiKey = this.encryptionService.encrypt(trimmedNewKey);
      apiKeyLast4 = trimmedNewKey.slice(-4);
    }

    if (dto.provider !== "OPENAI_COMPATIBLE" && !encryptedApiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `API key is required for provider ${dto.provider}.`,
      );
    }

    const baseUrlValue =
      dto.provider === "OPENAI_COMPATIBLE" ? dto.baseUrl || null : null;

    const saved = existing
      ? await this.prisma.organizationAiSetting.update({
          where: { id: existing.id, organizationId: orgId },
          data: {
            provider: dto.provider,
            modelId: dto.modelId.trim(),
            encryptedApiKey,
            apiKeyLast4,
            baseUrl: baseUrlValue,
            isEnabled: dto.isEnabled,
          },
        })
      : await this.prisma.organizationAiSetting.create({
          data: {
            organizationId: orgId,
            provider: dto.provider,
            modelId: dto.modelId.trim(),
            encryptedApiKey,
            apiKeyLast4,
            baseUrl: baseUrlValue,
            isEnabled: dto.isEnabled,
          },
        });

    await this.auditLog
      ?.logOrg(
        orgId,
        actorId ?? null,
        AUDIT_ACTIONS.AI_SETTINGS_UPDATED,
        AUDIT_RESOURCES.ORGANIZATION,
        {
          provider: dto.provider,
          modelId: dto.modelId.trim(),
          isEnabled: dto.isEnabled,
        },
        undefined,
        {
          targetId: saved.id,
          targetLabel: `${dto.provider} / ${dto.modelId.trim()}`,
        },
      )
      .catch(() => {});

    return this.mapToResponse(saved);
  }

  async deleteSetting(
    organizationId: string,
    actorId?: string,
  ): Promise<{ deleted: boolean }> {
    const orgId = this.requireOrgId(organizationId);
    const existing = await this.prisma.organizationAiSetting.findFirst({
      where: { organizationId: orgId },
    });
    if (!existing) {
      return { deleted: false };
    }

    await this.prisma.organizationAiSetting.deleteMany({
      where: { organizationId: orgId },
    });

    await this.auditLog
      ?.logOrg(
        orgId,
        actorId ?? null,
        AUDIT_ACTIONS.AI_SETTINGS_DELETED,
        AUDIT_RESOURCES.ORGANIZATION,
        {
          provider: existing.provider,
          modelId: existing.modelId,
        },
        undefined,
        {
          targetId: existing.id,
          targetLabel: `${existing.provider} / ${existing.modelId}`,
        },
      )
      .catch(() => {});

    return { deleted: true };
  }

  async testConnection(
    organizationId: string,
    dto: TestAiConnectionInput,
  ): Promise<TestAiConnectionResponse> {
    const orgId = this.requireOrgId(organizationId);
    if (dto.baseUrl) {
      assertSafeAiEndpointUrl(dto.baseUrl);
    }

    let apiKey = dto.apiKey?.trim() || "";
    if (!apiKey) {
      const existing = await this.prisma.organizationAiSetting.findFirst({
        where: { organizationId: orgId },
        select: { encryptedApiKey: true, provider: true },
      });
      if (existing?.encryptedApiKey && existing.provider === dto.provider) {
        apiKey = this.encryptionService.decrypt(existing.encryptedApiKey) || "";
      }
    }

    if (dto.provider !== "OPENAI_COMPATIBLE" && !apiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `API key is required to test ${dto.provider}.`,
      );
    }

    const startedAt = Date.now();
    await callAiCompletion({
      provider: dto.provider,
      modelId: dto.modelId.trim(),
      apiKey: apiKey || null,
      baseUrl: dto.baseUrl || null,
      systemPrompt: "Respond concisely with OK.",
      userPrompt: "Reply with OK.",
      maxTokens: 16,
      jsonMode: false,
    });

    return {
      ok: true,
      latencyMs: Math.max(1, Date.now() - startedAt),
      model: dto.modelId.trim(),
    };
  }

  async getActiveRuntimeConfig(
    organizationId: string,
  ): Promise<ActiveAiRuntimeConfig> {
    const orgId = this.requireOrgId(organizationId);
    const existing = await this.prisma.organizationAiSetting.findFirst({
      where: { organizationId: orgId },
    });

    if (!existing || !existing.isEnabled) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI provider is not configured or is disabled for this organization.",
      );
    }

    const apiKey = existing.encryptedApiKey
      ? this.encryptionService.decrypt(existing.encryptedApiKey)
      : null;

    if (existing.provider !== "OPENAI_COMPATIBLE" && !apiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI API key is missing for this organization.",
      );
    }

    return {
      provider: existing.provider as AiProvider,
      modelId: existing.modelId,
      apiKey,
      baseUrl: existing.baseUrl ?? null,
    };
  }
}
