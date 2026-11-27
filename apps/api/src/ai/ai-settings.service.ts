import { randomUUID } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  AI_FEATURE_KEYS,
  AUDIT_ACTIONS,
  MAX_AI_CONNECTIONS_PER_ORG,
  normalizeAiRouteTargets,
  testAiRouteTargetSchema,
  type AiConnectionResponse,
  type AiConnectionStatus,
  type AiFeatureKey,
  type AiFeatureRouteMode,
  type AiFeatureRouteResponse,
  type AiPolicyResponse,
  type AiProvider,
  type AiProxyMode,
  type AiRouteTarget,
  type CreateAiConnectionInput,
  type OrganizationAiFeatureStatus,
  type OrganizationAiOverviewResponse,
  type OrganizationAiStatusResponse,
  type TestAiConnectionInput,
  type TestAiConnectionResponse,
  type TestAiRouteResponse,
  type UpdateAiConnectionInput,
  type UpdateAiFeatureRoutesInput,
  type UpdateAiPolicyInput,
} from "@haihire/shared";
import { Prisma } from "@prisma/client";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";
import { toTimestamp } from "../common/date.util";
import { EncryptionService } from "../common/encryption.service";
import { OrganizationsAuditLogService } from "../organizations/services/organizations-audit-log.service";
import { PrismaService, runInTransaction } from "../prisma/prisma.service";
import { AiGatewayService } from "./ai-gateway.service";
import {
  assertSafeAiEndpointUrl,
  callAiCompletion,
} from "./ai-provider.client";

interface ConnectionRowShape {
  id: string;
  organizationId: string;
  name: string;
  provider: string;
  defaultModelId: string;
  encryptedApiKey: string | null;
  apiKeyLast4: string | null;
  baseUrl: string | null;
  isEnabled: boolean;
  lastStatus?: string | null;
  lastError?: string | null;
  lastTestedAt?: unknown;
  lastUsedAt?: unknown;
  consecutiveFailures?: number | null;
  createdAt: unknown;
  updatedAt: unknown;
}

@Injectable()
export class AiSettingsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
    @Inject(AiGatewayService)
    private readonly aiGatewayService: AiGatewayService,
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

  private mapConnectionToResponse(
    row: ConnectionRowShape,
    cooldownRemainingSec = 0,
  ): AiConnectionResponse {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      provider: row.provider as AiProvider,
      defaultModelId: row.defaultModelId,
      baseUrl: row.baseUrl ?? null,
      hasApiKey: Boolean(row.encryptedApiKey),
      apiKeyLast4: row.apiKeyLast4 ?? null,
      isEnabled: Boolean(row.isEnabled),
      lastStatus: (row.lastStatus as AiConnectionStatus) || "UNTESTED",
      lastError: row.lastError ?? null,
      lastTestedAt: row.lastTestedAt
        ? new Date(toTimestamp(row.lastTestedAt)).toISOString()
        : null,
      lastUsedAt: row.lastUsedAt
        ? new Date(toTimestamp(row.lastUsedAt)).toISOString()
        : null,
      consecutiveFailures: Number(row.consecutiveFailures ?? 0),
      cooldownRemainingSec,
      createdAt: new Date(toTimestamp(row.createdAt)).toISOString(),
      updatedAt: new Date(toTimestamp(row.updatedAt)).toISOString(),
    };
  }

  private mapPolicyToResponse(
    organizationId: string,
    row: {
      id: string;
      organizationId: string;
      isEnabled: boolean;
      autoScoreApplications?: boolean;
      defaultRouteMode?: string;
      defaultRouteTargets?: unknown;
      updatedAt: unknown;
    } | null,
  ): AiPolicyResponse {
    if (!row) {
      return {
        id: null,
        organizationId,
        isEnabled: true,
        autoScoreApplications: false,
        defaultRouteMode: "SINGLE",
        defaultRouteTargets: [],
        updatedAt: null,
      };
    }

    return {
      id: row.id,
      organizationId: row.organizationId,
      isEnabled: Boolean(row.isEnabled),
      autoScoreApplications: Boolean(row.autoScoreApplications),
      defaultRouteMode: (row.defaultRouteMode as AiProxyMode) || "SINGLE",
      defaultRouteTargets: normalizeAiRouteTargets(row.defaultRouteTargets),
      updatedAt: new Date(toTimestamp(row.updatedAt)).toISOString(),
    };
  }

  private async validateTargetConnectionIds(
    organizationId: string,
    targets: AiRouteTarget[],
  ): Promise<AiRouteTarget[]> {
    const unique: AiRouteTarget[] = [];
    const seen = new Set<string>();
    for (const target of targets) {
      if (seen.has(target.connectionId)) continue;
      seen.add(target.connectionId);
      unique.push({
        connectionId: target.connectionId,
        modelId: target.modelId?.trim() || null,
        weight: target.weight ?? 1,
      });
    }

    if (unique.length === 0) return unique;

    const ids = unique.map((t) => t.connectionId);
    const owned = await this.prisma.organizationAiConnection.findMany({
      where: { organizationId, id: { in: ids } },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((row) => row.id));
    for (const id of ids) {
      if (!ownedSet.has(id)) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.AI_CONNECTION_NOT_FOUND,
          `AI connection ${id} does not exist in this organization.`,
        );
      }
    }

    return unique;
  }

  async getStatus(
    organizationId?: string | null,
  ): Promise<OrganizationAiStatusResponse> {
    const orgId = this.requireOrgId(organizationId);
    const [setting, connections, featureStatuses] = await Promise.all([
      this.prisma.organizationAiSetting.findFirst({
        where: { organizationId: orgId },
        select: {
          isEnabled: true,
          autoScoreApplications: true,
        },
      }),
      this.prisma.organizationAiConnection.findMany({
        where: { organizationId: orgId, isEnabled: true },
        select: { provider: true, encryptedApiKey: true },
      }),
      Promise.all(
        AI_FEATURE_KEYS.map(async (feature) => [
          feature,
          await this.aiGatewayService.resolveFeatureStatus(orgId, feature),
        ]),
      ) as Promise<Array<[AiFeatureKey, OrganizationAiFeatureStatus]>>,
    ]);

    const features = Object.fromEntries(featureStatuses) as Record<
      AiFeatureKey,
      OrganizationAiFeatureStatus
    >;

    const activeConnectionsCount = connections.filter(
      (c) => c.provider === "OPENAI_COMPATIBLE" || Boolean(c.encryptedApiKey),
    ).length;

    const orgEnabled = setting ? Boolean(setting.isEnabled) : true;
    const anyFeatureReady = Object.values(features).some((f) => f.enabled);
    const primarySource =
      features.APPLICATION_SCORING.primaryProvider !== undefined
        ? features.APPLICATION_SCORING
        : Object.values(features).find((f) => f.primaryProvider !== undefined);

    const configured = activeConnectionsCount > 0;
    const enabled = orgEnabled && anyFeatureReady;

    return {
      configured,
      enabled,
      autoScoreApplications:
        Boolean(features.APPLICATION_SCORING?.enabled) &&
        Boolean(setting?.autoScoreApplications),
      activeConnectionsCount,
      ...(primarySource?.primaryProvider
        ? {
            provider: primarySource.primaryProvider,
            modelId: primarySource.primaryModelId,
          }
        : {}),
      features,
    };
  }

  async getOverview(
    organizationId?: string | null,
  ): Promise<OrganizationAiOverviewResponse> {
    const orgId = this.requireOrgId(organizationId);
    const [setting, connectionRows, routeRows] = await Promise.all([
      this.prisma.organizationAiSetting.findFirst({
        where: { organizationId: orgId },
      }),
      this.prisma.organizationAiConnection.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.organizationAiFeatureRoute.findMany({
        where: { organizationId: orgId },
      }),
    ]);

    const cooldownMap = await this.aiGatewayService.getCooldownRemainingSeconds(
      orgId,
      connectionRows.map((c) => c.id),
    );

    const routeByFeature = new Map(
      routeRows.map((row) => [row.feature as AiFeatureKey, row]),
    );

    const routes: AiFeatureRouteResponse[] = AI_FEATURE_KEYS.map((feature) => {
      const existing = routeByFeature.get(feature);
      if (!existing) {
        return {
          feature,
          isEnabled: true,
          mode: "INHERIT_DEFAULT",
          targets: [],
        };
      }
      return {
        feature,
        isEnabled: Boolean(existing.isEnabled),
        mode: existing.mode as AiFeatureRouteMode,
        targets: normalizeAiRouteTargets(existing.targets),
      };
    });

    return {
      policy: this.mapPolicyToResponse(orgId, setting),
      connections: connectionRows.map((row) =>
        this.mapConnectionToResponse(
          row as ConnectionRowShape,
          cooldownMap[row.id] ?? 0,
        ),
      ),
      routes,
    };
  }

  async updatePolicy(
    organizationId: string,
    actorId: string | undefined,
    dto: UpdateAiPolicyInput,
  ): Promise<AiPolicyResponse> {
    const orgId = this.requireOrgId(organizationId);
    const cleanTargets = await this.validateTargetConnectionIds(
      orgId,
      dto.defaultRouteTargets,
    );

    const existing = await this.prisma.organizationAiSetting.findFirst({
      where: { organizationId: orgId },
    });

    const dataPayload = {
      isEnabled: dto.isEnabled,
      autoScoreApplications: dto.autoScoreApplications,
      defaultRouteMode: dto.defaultRouteMode,
      defaultRouteTargets: cleanTargets as unknown as Prisma.InputJsonValue,
    };

    const saved = existing
      ? await this.prisma.organizationAiSetting.update({
          where: { id: existing.id, organizationId: orgId },
          data: dataPayload,
        })
      : await this.prisma.organizationAiSetting.create({
          data: {
            id: randomUUID(),
            organizationId: orgId,
            ...dataPayload,
          },
        });

    await this.auditLog
      ?.logOrgChange({
        organizationId: orgId,
        actorId,
        action: AUDIT_ACTIONS.AI_POLICY_UPDATED,
        targetId: saved.id,
        targetLabel: `AI Policy (${dto.defaultRouteMode})`,
        before: existing
          ? {
              isEnabled: existing.isEnabled,
              autoScoreApplications: existing.autoScoreApplications,
              defaultRouteMode: existing.defaultRouteMode,
              defaultRouteTargets: normalizeAiRouteTargets(
                existing.defaultRouteTargets,
              ),
            }
          : null,
        after: {
          isEnabled: saved.isEnabled,
          autoScoreApplications: saved.autoScoreApplications,
          defaultRouteMode: saved.defaultRouteMode,
          defaultRouteTargets: cleanTargets,
        },
        metadata: {
          defaultRouteMode: dto.defaultRouteMode,
          targetCount: cleanTargets.length,
        },
      })
      .catch(() => {});

    return this.mapPolicyToResponse(orgId, saved);
  }

  async createConnection(
    organizationId: string,
    actorId: string | undefined,
    dto: CreateAiConnectionInput,
  ): Promise<AiConnectionResponse> {
    const orgId = this.requireOrgId(organizationId);
    if (dto.baseUrl) {
      assertSafeAiEndpointUrl(dto.baseUrl);
    }

    const currentCount = await this.prisma.organizationAiConnection.count({
      where: { organizationId: orgId },
    });
    if (currentCount >= MAX_AI_CONNECTIONS_PER_ORG) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Maximum of ${MAX_AI_CONNECTIONS_PER_ORG} AI connections allowed per organization.`,
      );
    }

    const trimmedKey = dto.apiKey?.trim() || "";
    if (dto.provider !== "OPENAI_COMPATIBLE" && !trimmedKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `API key is required for provider ${dto.provider}.`,
      );
    }

    const encryptedApiKey = trimmedKey
      ? this.encryptionService.encrypt(trimmedKey)
      : null;
    const apiKeyLast4 = trimmedKey ? trimmedKey.slice(-4) : null;

    const created = await runInTransaction(this.prisma, async (tx) => {
      const conn = await tx.organizationAiConnection.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          name: dto.name.trim(),
          provider: dto.provider,
          defaultModelId: dto.defaultModelId.trim(),
          encryptedApiKey,
          apiKeyLast4,
          baseUrl: dto.baseUrl || null,
          isEnabled: dto.isEnabled,
        },
      });

      // Attach first active connection to org default targets automatically for seamless setup.
      const existingSetting = await tx.organizationAiSetting.findFirst({
        where: { organizationId: orgId },
      });
      const existingTargets = normalizeAiRouteTargets(
        existingSetting?.defaultRouteTargets,
      );
      if (existingTargets.length === 0) {
        const nextTargets: AiRouteTarget[] = [
          { connectionId: conn.id, modelId: null, weight: 1 },
        ];
        if (existingSetting) {
          await tx.organizationAiSetting.update({
            where: { id: existingSetting.id, organizationId: orgId },
            data: {
              defaultRouteTargets:
                nextTargets as unknown as Prisma.InputJsonValue,
            },
          });
        } else {
          await tx.organizationAiSetting.create({
            data: {
              id: randomUUID(),
              organizationId: orgId,
              isEnabled: true,
              autoScoreApplications: false,
              defaultRouteMode: "SINGLE",
              defaultRouteTargets:
                nextTargets as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }

      return conn;
    });

    await this.auditLog
      ?.logOrgChange({
        organizationId: orgId,
        actorId,
        action: AUDIT_ACTIONS.AI_CONNECTION_CREATED,
        targetId: created.id,
        targetLabel: `${dto.name.trim()} (${dto.provider})`,
        metadata: {
          provider: dto.provider,
          modelId: dto.defaultModelId.trim(),
        },
      })
      .catch(() => {});

    return this.mapConnectionToResponse(created as ConnectionRowShape, 0);
  }

  async updateConnection(
    organizationId: string,
    actorId: string | undefined,
    connectionId: string,
    dto: UpdateAiConnectionInput,
  ): Promise<AiConnectionResponse> {
    const orgId = this.requireOrgId(organizationId);
    const existing = await this.prisma.organizationAiConnection.findFirst({
      where: { id: connectionId, organizationId: orgId },
    });
    if (!existing) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.AI_CONNECTION_NOT_FOUND,
        "AI connection not found.",
      );
    }

    const nextProvider = (dto.provider ?? existing.provider) as AiProvider;
    const nextBaseUrl =
      dto.baseUrl !== undefined ? dto.baseUrl : existing.baseUrl;

    if (nextBaseUrl) {
      assertSafeAiEndpointUrl(nextBaseUrl);
    }
    if (nextProvider === "OPENAI_COMPATIBLE" && !nextBaseUrl) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Valid HTTP(S) base URL is required for OpenAI-Compatible providers.",
      );
    }

    const trimmedNewKey = dto.apiKey?.trim() || "";
    const encryptedApiKey = trimmedNewKey
      ? this.encryptionService.encrypt(trimmedNewKey)
      : existing.encryptedApiKey;
    const apiKeyLast4 = trimmedNewKey
      ? trimmedNewKey.slice(-4)
      : existing.apiKeyLast4;

    if (nextProvider !== "OPENAI_COMPATIBLE" && !encryptedApiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `API key is required for provider ${nextProvider}.`,
      );
    }

    const updated = await this.prisma.organizationAiConnection.update({
      where: { id: existing.id, organizationId: orgId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        provider: nextProvider,
        defaultModelId:
          dto.defaultModelId !== undefined
            ? dto.defaultModelId.trim()
            : existing.defaultModelId,
        encryptedApiKey,
        apiKeyLast4,
        baseUrl: nextBaseUrl ?? null,
        isEnabled:
          dto.isEnabled !== undefined ? dto.isEnabled : existing.isEnabled,
        ...(trimmedNewKey ||
        dto.provider !== undefined ||
        dto.baseUrl !== undefined
          ? { lastError: null, consecutiveFailures: 0 }
          : {}),
      },
    });

    await this.aiGatewayService.clearCooldown(orgId, existing.id);

    await this.auditLog
      ?.logOrgChange({
        organizationId: orgId,
        actorId,
        action: AUDIT_ACTIONS.AI_CONNECTION_UPDATED,
        targetId: updated.id,
        targetLabel: `${updated.name} (${nextProvider})`,
        before: {
          name: existing.name,
          provider: existing.provider,
          defaultModelId: existing.defaultModelId,
          baseUrl: existing.baseUrl,
          isEnabled: existing.isEnabled,
          ...(trimmedNewKey ? { apiKey: existing.encryptedApiKey } : {}),
        },
        after: {
          name: updated.name,
          provider: updated.provider,
          defaultModelId: updated.defaultModelId,
          baseUrl: updated.baseUrl,
          isEnabled: updated.isEnabled,
          ...(trimmedNewKey ? { apiKey: trimmedNewKey } : {}),
        },
        metadata: {
          provider: nextProvider,
          isEnabled: updated.isEnabled,
        },
      })
      .catch(() => {});

    const cooldownMap = await this.aiGatewayService.getCooldownRemainingSeconds(
      orgId,
      [updated.id],
    );
    return this.mapConnectionToResponse(
      updated as ConnectionRowShape,
      cooldownMap[updated.id] ?? 0,
    );
  }

  async deleteConnection(
    organizationId: string,
    actorId: string | undefined,
    connectionId: string,
  ): Promise<{ deleted: boolean }> {
    const orgId = this.requireOrgId(organizationId);

    const removed = await runInTransaction(this.prisma, async (tx) => {
      const existing = await tx.organizationAiConnection.findFirst({
        where: { id: connectionId, organizationId: orgId },
      });
      if (!existing) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.AI_CONNECTION_NOT_FOUND,
          "AI connection not found.",
        );
      }

      await tx.organizationAiConnection.deleteMany({
        where: { id: connectionId, organizationId: orgId },
      });

      const setting = await tx.organizationAiSetting.findFirst({
        where: { organizationId: orgId },
      });
      if (setting) {
        const currentTargets = normalizeAiRouteTargets(
          setting.defaultRouteTargets,
        );
        const filtered = currentTargets.filter(
          (t) => t.connectionId !== connectionId,
        );
        if (filtered.length !== currentTargets.length) {
          await tx.organizationAiSetting.update({
            where: { id: setting.id, organizationId: orgId },
            data: {
              defaultRouteTargets: filtered as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }

      const routes = await tx.organizationAiFeatureRoute.findMany({
        where: { organizationId: orgId },
      });
      for (const route of routes) {
        const currentTargets = normalizeAiRouteTargets(route.targets);
        const filtered = currentTargets.filter(
          (t) => t.connectionId !== connectionId,
        );
        if (filtered.length !== currentTargets.length) {
          await tx.organizationAiFeatureRoute.update({
            where: { id: route.id, organizationId: orgId },
            data: {
              targets: filtered as unknown as Prisma.InputJsonValue,
              ...(route.mode === "SINGLE" && filtered.length === 0
                ? { mode: "INHERIT_DEFAULT" }
                : {}),
            },
          });
        }
      }

      return existing;
    });

    await this.aiGatewayService.clearCooldown(orgId, connectionId);

    await this.auditLog
      ?.logOrgChange({
        organizationId: orgId,
        actorId,
        action: AUDIT_ACTIONS.AI_CONNECTION_DELETED,
        targetId: removed.id,
        targetLabel: `${removed.name} (${removed.provider})`,
        metadata: {
          provider: removed.provider,
          modelId: removed.defaultModelId,
        },
      })
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

    let existingConn: {
      id: string;
      provider: string;
      encryptedApiKey: string | null;
      baseUrl: string | null;
    } | null = null;

    if (dto.connectionId) {
      existingConn = await this.prisma.organizationAiConnection.findFirst({
        where: { id: dto.connectionId, organizationId: orgId },
        select: {
          id: true,
          provider: true,
          encryptedApiKey: true,
          baseUrl: true,
        },
      });
      if (!existingConn) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.AI_CONNECTION_NOT_FOUND,
          "AI connection not found.",
        );
      }
    }

    let apiKey = dto.apiKey?.trim() || "";
    if (
      !apiKey &&
      existingConn?.encryptedApiKey &&
      existingConn.provider === dto.provider
    ) {
      apiKey =
        this.encryptionService.decrypt(existingConn.encryptedApiKey) || "";
    }

    const effectiveBaseUrl =
      dto.baseUrl !== undefined ? dto.baseUrl : (existingConn?.baseUrl ?? null);
    if (effectiveBaseUrl) {
      assertSafeAiEndpointUrl(effectiveBaseUrl);
    }

    if (dto.provider !== "OPENAI_COMPATIBLE" && !apiKey) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `API key is required to test ${dto.provider}.`,
      );
    }

    const startedAt = Date.now();
    try {
      await callAiCompletion({
        provider: dto.provider,
        modelId: dto.modelId.trim(),
        apiKey: apiKey || null,
        baseUrl: effectiveBaseUrl,
        systemPrompt: "Respond concisely with OK.",
        userPrompt: "Reply with OK.",
        maxTokens: 16,
        jsonMode: false,
      });

      if (existingConn) {
        await this.aiGatewayService.clearCooldown(orgId, existingConn.id);
        await this.prisma.organizationAiConnection.updateMany({
          where: { id: existingConn.id, organizationId: orgId },
          data: {
            lastStatus: "HEALTHY",
            lastError: null,
            lastTestedAt: new Date(),
            consecutiveFailures: 0,
          },
        });
      }

      return {
        ok: true,
        latencyMs: Math.max(1, Date.now() - startedAt),
        model: dto.modelId.trim(),
      };
    } catch (err: unknown) {
      if (existingConn) {
        const msg = (
          err instanceof Error ? err.message : "Connection test failed."
        )
          .replace(/[\r\n]+/g, " ")
          .slice(0, 280);
        await this.prisma.organizationAiConnection.updateMany({
          where: { id: existingConn.id, organizationId: orgId },
          data: {
            lastStatus: "ERROR",
            lastError: msg,
            lastTestedAt: new Date(),
          },
        });
      }
      throw err;
    }
  }

  async updateFeatureRoutes(
    organizationId: string,
    actorId: string | undefined,
    dto: UpdateAiFeatureRoutesInput,
  ): Promise<AiFeatureRouteResponse[]> {
    const orgId = this.requireOrgId(organizationId);
    const allTargets = dto.routes.flatMap((r) => r.targets);
    await this.validateTargetConnectionIds(orgId, allTargets);

    await runInTransaction(this.prisma, async (tx) => {
      for (const route of dto.routes) {
        const normalizedTargets = normalizeAiRouteTargets(route.targets);
        const existing = await tx.organizationAiFeatureRoute.findFirst({
          where: { organizationId: orgId, feature: route.feature },
        });
        if (existing) {
          await tx.organizationAiFeatureRoute.update({
            where: { id: existing.id, organizationId: orgId },
            data: {
              isEnabled: route.isEnabled,
              mode: route.mode,
              targets: normalizedTargets as unknown as Prisma.InputJsonValue,
            },
          });
        } else {
          await tx.organizationAiFeatureRoute.create({
            data: {
              id: randomUUID(),
              organizationId: orgId,
              feature: route.feature,
              isEnabled: route.isEnabled,
              mode: route.mode,
              targets: normalizedTargets as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }
    });

    await this.auditLog
      ?.logOrgChange({
        organizationId: orgId,
        actorId,
        action: AUDIT_ACTIONS.AI_ROUTES_UPDATED,
        targetId: orgId,
        targetLabel: "AI Feature Routing",
        metadata: {
          features: dto.routes.map((r) => `${r.feature}:${r.mode}`),
        },
      })
      .catch(() => {});

    const overview = await this.getOverview(orgId);
    return overview.routes;
  }

  async testFeatureRoute(
    organizationId: string,
    rawFeature: string,
  ): Promise<TestAiRouteResponse> {
    const orgId = this.requireOrgId(organizationId);
    const parsed = testAiRouteTargetSchema.safeParse(rawFeature);
    if (!parsed.success) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Invalid AI route target: ${rawFeature}`,
      );
    }
    return this.aiGatewayService.testRoute(orgId, parsed.data);
  }
}
