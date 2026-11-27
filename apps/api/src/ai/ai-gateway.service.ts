import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type Redis from "ioredis";
import {
  APP_ERROR_CODES,
  normalizeAiRouteTargets,
  type AiFeatureKey,
  type AiFeatureRouteMode,
  type AiProvider,
  type AiProxyMode,
  type AiRouteTarget,
  type AiRouteTestTarget,
  type OrganizationAiFeatureStatus,
  type TestAiRouteAttemptResult,
  type TestAiRouteResponse,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
} from "../common/app-exception";
import { EncryptionService } from "../common/encryption.service";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.constants";
import {
  AiProviderCallError,
  callAiCompletion,
  providerSupportsPdfAttachment,
  type AiPdfAttachment,
} from "./ai-provider.client";

interface ConnectionRecordRow {
  id: string;
  organizationId: string;
  name: string;
  provider: string;
  defaultModelId: string;
  encryptedApiKey: string | null;
  baseUrl: string | null;
  isEnabled: boolean;
  consecutiveFailures?: number;
}

export interface ResolvedAiCandidate {
  id: string;
  name: string;
  provider: AiProvider;
  modelId: string;
  apiKey: string | null;
  baseUrl: string | null;
  weight: number;
  consecutiveFailures: number;
}

export interface AiGatewayExecuteRequest {
  systemPrompt: string;
  userPrompt?: string;
  buildUserPrompt?: (supportsPdfAttachment: boolean) => string;
  maxTokens?: number;
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
  totalTimeoutMs?: number;
  pdfAttachment?: AiPdfAttachment;
}

export interface AiGatewayExecuteResult {
  text: string;
  provider: AiProvider;
  modelId: string;
  connectionId: string;
  connectionName: string;
  attempts: number;
}

const DEFAULT_SYNC_BUDGET_MS = 25_000;
const DEFAULT_ASYNC_BUDGET_MS = 60_000;
const MAX_PROXY_ATTEMPTS = 3;
const COOLDOWN_RATE_LIMIT_SEC = 60;
const COOLDOWN_AUTH_OR_QUOTA_SEC = 300;
const COOLDOWN_TRANSIENT_SEC = 30;
const ROUTE_TEST_TIMEOUT_MS = 12_000;

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly memoryCooldowns = new Map<string, number>();
  private readonly memoryCounters = new Map<string, number>();

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
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

  private isRedisUsable(): boolean {
    if (!this.redis) return false;
    const status = (this.redis as { status?: string }).status;
    return status === undefined || status === "ready" || status === "connect";
  }

  private cooldownKey(organizationId: string, connectionId: string): string {
    return `ai:cooldown:${organizationId}:${connectionId}`;
  }

  private counterKey(organizationId: string, scope: string): string {
    return `ai:rr:${organizationId}:${scope}`;
  }

  async getCooldownRemainingSeconds(
    organizationId: string,
    connectionIds: string[],
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (connectionIds.length === 0) return result;

    const now = Date.now();
    const useRedis = this.isRedisUsable();

    await Promise.all(
      connectionIds.map(async (connId) => {
        const key = this.cooldownKey(organizationId, connId);
        if (useRedis && this.redis) {
          try {
            const ttl = await this.redis.ttl(key);
            if (typeof ttl === "number" && ttl > 0) {
              result[connId] = ttl;
              return;
            }
          } catch {
            // Fall back to in-memory cooldown cache
          }
        }
        const expiresAt = this.memoryCooldowns.get(key);
        if (expiresAt && expiresAt > now) {
          result[connId] = Math.max(1, Math.ceil((expiresAt - now) / 1000));
        } else {
          this.memoryCooldowns.delete(key);
          result[connId] = 0;
        }
      }),
    );

    return result;
  }

  async setCooldown(
    organizationId: string,
    connectionId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.cooldownKey(organizationId, connectionId);
    const safeTtl = Math.max(1, Math.round(ttlSeconds));
    this.memoryCooldowns.set(key, Date.now() + safeTtl * 1000);

    if (this.isRedisUsable() && this.redis) {
      try {
        await this.redis.set(key, "1", "EX", safeTtl);
      } catch {
        // Non-fatal fallback to in-memory cooldown
      }
    }
  }

  async clearCooldown(
    organizationId: string,
    connectionId: string,
  ): Promise<void> {
    const key = this.cooldownKey(organizationId, connectionId);
    this.memoryCooldowns.delete(key);

    if (this.isRedisUsable() && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // Non-fatal cleanup error
      }
    }
  }

  private async nextRoundRobinCounter(
    organizationId: string,
    scope: string,
  ): Promise<number> {
    const key = this.counterKey(organizationId, scope);
    if (this.isRedisUsable() && this.redis) {
      try {
        const nextVal = await this.redis.incr(key);
        if (nextVal === 1) {
          await this.redis.expire(key, 86_400);
        }
        return nextVal;
      } catch {
        // Fall back to process-local counter
      }
    }

    const next = (this.memoryCounters.get(key) ?? 0) + 1;
    this.memoryCounters.set(key, next);
    return next;
  }

  private gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  }

  private expandWeightedSlots(
    candidates: ResolvedAiCandidate[],
  ): ResolvedAiCandidate[] {
    if (candidates.length <= 1) return candidates;
    const rawWeights = candidates.map((c) => Math.max(1, Math.round(c.weight)));
    const divisor = rawWeights.reduce((acc, w) => this.gcd(acc, w));
    const normalized = rawWeights.map((w) =>
      Math.max(1, Math.round(w / divisor)),
    );
    const sum = normalized.reduce((a, b) => a + b, 0);
    const scale = sum > 100 ? 100 / sum : 1;

    const slots: ResolvedAiCandidate[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const count = Math.max(1, Math.round(normalized[i] * scale));
      for (let s = 0; s < count; s++) {
        slots.push(candidates[i]);
      }
    }
    return slots;
  }

  private orderCandidatesForLoadBalance(
    candidates: ResolvedAiCandidate[],
    counterValue: number,
  ): ResolvedAiCandidate[] {
    if (candidates.length <= 1) return candidates;
    const slots = this.expandWeightedSlots(candidates);
    const chosenIndex = (Math.max(1, counterValue) - 1) % slots.length;
    const primary = slots[chosenIndex];
    const startIdx = candidates.findIndex((c) => c.id === primary.id);
    if (startIdx <= 0) return candidates;
    return [...candidates.slice(startIdx), ...candidates.slice(0, startIdx)];
  }

  private resolveCandidatesFromTargets(
    targets: AiRouteTarget[],
    connections: ConnectionRecordRow[],
  ): ResolvedAiCandidate[] {
    const connMap = new Map(connections.map((c) => [c.id, c]));
    const resolved: ResolvedAiCandidate[] = [];

    for (const target of targets) {
      const conn = connMap.get(target.connectionId);
      if (!conn || !conn.isEnabled) continue;

      const provider = conn.provider as AiProvider;
      const decryptedKey = conn.encryptedApiKey
        ? this.encryptionService.decrypt(conn.encryptedApiKey)
        : null;
      if (provider !== "OPENAI_COMPATIBLE" && !decryptedKey) continue;

      const effectiveModel =
        target.modelId?.trim() || conn.defaultModelId.trim();
      if (!effectiveModel) continue;

      resolved.push({
        id: conn.id,
        name: conn.name,
        provider,
        modelId: effectiveModel,
        apiKey: decryptedKey,
        baseUrl: conn.baseUrl ?? null,
        weight: target.weight ?? 1,
        consecutiveFailures: conn.consecutiveFailures ?? 0,
      });
    }

    return resolved;
  }

  async resolveExecutionPlan(
    organizationId: string,
    targetKey: AiRouteTestTarget,
  ): Promise<{
    orgEnabled: boolean;
    featureEnabled: boolean;
    mode: AiFeatureRouteMode;
    effectiveMode: AiProxyMode;
    candidates: ResolvedAiCandidate[];
  }> {
    const orgId = this.requireOrgId(organizationId);

    const [setting, featureRoute, connections] = await Promise.all([
      this.prisma.organizationAiSetting.findFirst({
        where: { organizationId: orgId },
        select: {
          isEnabled: true,
          defaultRouteMode: true,
          defaultRouteTargets: true,
        },
      }),
      targetKey === "GLOBAL_DEFAULT"
        ? Promise.resolve(null)
        : this.prisma.organizationAiFeatureRoute.findFirst({
            where: { organizationId: orgId, feature: targetKey },
            select: {
              isEnabled: true,
              mode: true,
              targets: true,
            },
          }),
      this.prisma.organizationAiConnection.findMany({
        where: { organizationId: orgId, isEnabled: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const orgEnabled = setting ? Boolean(setting.isEnabled) : true;
    const defaultMode: AiProxyMode =
      (setting?.defaultRouteMode as AiProxyMode) || "SINGLE";
    const defaultTargets = normalizeAiRouteTargets(
      setting?.defaultRouteTargets,
    );

    const routeMode: AiFeatureRouteMode =
      targetKey === "GLOBAL_DEFAULT"
        ? defaultMode
        : ((featureRoute?.mode as AiFeatureRouteMode) ?? "INHERIT_DEFAULT");
    const featureEnabled =
      targetKey === "GLOBAL_DEFAULT"
        ? orgEnabled
        : orgEnabled && (featureRoute ? Boolean(featureRoute.isEnabled) : true);

    const usesDefault =
      targetKey === "GLOBAL_DEFAULT" || routeMode === "INHERIT_DEFAULT";
    const effectiveMode: AiProxyMode = usesDefault
      ? defaultMode
      : (routeMode as AiProxyMode);
    const rawTargets = usesDefault
      ? defaultTargets
      : normalizeAiRouteTargets(featureRoute?.targets);

    const scopedTargets =
      effectiveMode === "SINGLE" ? rawTargets.slice(0, 1) : rawTargets;
    const candidates = this.resolveCandidatesFromTargets(
      scopedTargets,
      connections as ConnectionRecordRow[],
    );

    return {
      orgEnabled,
      featureEnabled,
      mode: routeMode,
      effectiveMode,
      candidates,
    };
  }

  async resolveFeatureStatus(
    organizationId: string,
    feature: AiFeatureKey,
  ): Promise<OrganizationAiFeatureStatus> {
    const plan = await this.resolveExecutionPlan(organizationId, feature);
    const enabled = plan.featureEnabled && plan.candidates.length > 0;
    const primary = plan.candidates[0];
    return {
      enabled,
      mode: plan.mode,
      effectiveMode: plan.effectiveMode,
      activeTargetCount: plan.candidates.length,
      ...(primary
        ? { primaryProvider: primary.provider, primaryModelId: primary.modelId }
        : {}),
    };
  }

  async assertFeatureReady(
    organizationId: string,
    feature: AiFeatureKey,
  ): Promise<void> {
    const plan = await this.resolveExecutionPlan(organizationId, feature);
    if (!plan.orgEnabled) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI features are disabled for this organization.",
      );
    }
    if (!plan.featureEnabled) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        `AI is disabled for ${feature}.`,
      );
    }
    if (plan.candidates.length === 0) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "No active AI API key is configured for this feature.",
      );
    }
  }

  private async recordConnectionSuccess(
    organizationId: string,
    connectionId: string,
  ): Promise<void> {
    await this.clearCooldown(organizationId, connectionId);
    try {
      await this.prisma.organizationAiConnection.updateMany({
        where: { id: connectionId, organizationId },
        data: {
          lastStatus: "HEALTHY",
          lastError: null,
          lastUsedAt: new Date(),
          consecutiveFailures: 0,
        },
      });
    } catch {
      // Non-fatal metrics persistence failure
    }
  }

  private async recordConnectionFailure(
    organizationId: string,
    connectionId: string,
    err: unknown,
    currentFailures: number,
  ): Promise<string> {
    const rawMsg =
      err instanceof Error ? err.message : "AI connection request failed.";
    const cleanMsg = rawMsg.replace(/[\r\n]+/g, " ").slice(0, 280);

    let cooldownSec = COOLDOWN_TRANSIENT_SEC;
    if (err instanceof AiProviderCallError) {
      if (err.meta.isRateLimited) {
        cooldownSec = COOLDOWN_RATE_LIMIT_SEC;
      } else if (err.meta.isAuthError || err.meta.httpStatus === 402) {
        cooldownSec = COOLDOWN_AUTH_OR_QUOTA_SEC;
      }
    }
    await this.setCooldown(organizationId, connectionId, cooldownSec);

    try {
      await this.prisma.organizationAiConnection.updateMany({
        where: { id: connectionId, organizationId },
        data: {
          lastStatus: "ERROR",
          lastError: cleanMsg,
          consecutiveFailures: Math.max(0, currentFailures) + 1,
        },
      });
    } catch {
      // Non-fatal metrics persistence failure
    }

    return cleanMsg;
  }

  async execute(
    organizationId: string,
    feature: AiFeatureKey,
    request: AiGatewayExecuteRequest,
  ): Promise<AiGatewayExecuteResult> {
    const orgId = this.requireOrgId(organizationId);
    const plan = await this.resolveExecutionPlan(orgId, feature);

    if (
      !plan.orgEnabled ||
      !plan.featureEnabled ||
      plan.candidates.length === 0
    ) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI provider is not configured or is disabled for this feature.",
      );
    }

    let ordered = plan.candidates;
    if (plan.effectiveMode === "LOAD_BALANCE" && ordered.length > 1) {
      const counter = await this.nextRoundRobinCounter(orgId, feature);
      ordered = this.orderCandidatesForLoadBalance(ordered, counter);
    }

    const cooldownMap = await this.getCooldownRemainingSeconds(
      orgId,
      ordered.map((c) => c.id),
    );
    const ready = ordered.filter((c) => (cooldownMap[c.id] ?? 0) <= 0);
    const cooling = ordered
      .filter((c) => (cooldownMap[c.id] ?? 0) > 0)
      .sort((a, b) => (cooldownMap[a.id] ?? 0) - (cooldownMap[b.id] ?? 0));
    const dispatchQueue = [...ready, ...cooling];

    const totalBudgetMs =
      request.totalTimeoutMs ??
      (feature === "APPLICATION_SCORING"
        ? DEFAULT_ASYNC_BUDGET_MS
        : DEFAULT_SYNC_BUDGET_MS);
    const deadlineMs = Date.now() + totalBudgetMs;
    const maxAttempts = Math.min(dispatchQueue.length, MAX_PROXY_ATTEMPTS);

    let lastErrorMsg = "";
    let attemptsMade = 0;

    for (let idx = 0; idx < maxAttempts; idx++) {
      const candidate = dispatchQueue[idx];
      const remainingMs = deadlineMs - Date.now();
      if (idx > 0 && remainingMs < 2500) {
        break;
      }
      attemptsMade++;

      const attemptTimeoutMs = Math.max(
        3500,
        Math.min(request.timeoutMs ?? 20_000, remainingMs),
      );
      const supportsPdf = providerSupportsPdfAttachment(candidate.provider);
      const userPrompt = request.buildUserPrompt
        ? request.buildUserPrompt(supportsPdf)
        : (request.userPrompt ?? "");

      try {
        const text = await callAiCompletion({
          provider: candidate.provider,
          modelId: candidate.modelId,
          apiKey: candidate.apiKey,
          baseUrl: candidate.baseUrl,
          systemPrompt: request.systemPrompt,
          userPrompt,
          maxTokens: request.maxTokens,
          jsonMode: request.jsonMode,
          temperature: request.temperature,
          timeoutMs: attemptTimeoutMs,
          ...(supportsPdf && request.pdfAttachment
            ? { pdfAttachment: request.pdfAttachment }
            : {}),
        });

        await this.recordConnectionSuccess(orgId, candidate.id);
        return {
          text,
          provider: candidate.provider,
          modelId: candidate.modelId,
          connectionId: candidate.id,
          connectionName: candidate.name,
          attempts: attemptsMade,
        };
      } catch (err: unknown) {
        lastErrorMsg = await this.recordConnectionFailure(
          orgId,
          candidate.id,
          err,
          candidate.consecutiveFailures,
        );
        this.logger.warn(
          `[AiGateway] Attempt ${attemptsMade}/${maxAttempts} failed for org=${orgId} feature=${feature} conn=${candidate.name}: ${lastErrorMsg.slice(0, 120)}`,
        );
      }
    }

    throw new AppBadRequestException(
      dispatchQueue.length > 1
        ? APP_ERROR_CODES.AI_ALL_PROVIDERS_FAILED
        : APP_ERROR_CODES.AI_CONNECTION_FAILED,
      lastErrorMsg || "All configured AI connections failed.",
    );
  }

  async testRoute(
    organizationId: string,
    targetKey: AiRouteTestTarget,
  ): Promise<TestAiRouteResponse> {
    const orgId = this.requireOrgId(organizationId);
    const plan = await this.resolveExecutionPlan(orgId, targetKey);

    if (plan.candidates.length === 0) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "No active AI connection is assigned to this route.",
      );
    }

    const totalStart = Date.now();
    const attempts: TestAiRouteAttemptResult[] = [];
    let succeededConnectionId: string | undefined;

    for (const candidate of plan.candidates) {
      const attemptStart = Date.now();
      try {
        await callAiCompletion({
          provider: candidate.provider,
          modelId: candidate.modelId,
          apiKey: candidate.apiKey,
          baseUrl: candidate.baseUrl,
          systemPrompt: "Respond concisely with OK.",
          userPrompt: "Reply with OK.",
          maxTokens: 16,
          jsonMode: false,
          timeoutMs: ROUTE_TEST_TIMEOUT_MS,
        });

        await this.clearCooldown(orgId, candidate.id);
        await this.prisma.organizationAiConnection.updateMany({
          where: { id: candidate.id, organizationId: orgId },
          data: {
            lastStatus: "HEALTHY",
            lastError: null,
            lastTestedAt: new Date(),
            consecutiveFailures: 0,
          },
        });

        if (!succeededConnectionId) {
          succeededConnectionId = candidate.id;
        }
        attempts.push({
          connectionId: candidate.id,
          connectionName: candidate.name,
          provider: candidate.provider,
          modelId: candidate.modelId,
          ok: true,
          latencyMs: Math.max(1, Date.now() - attemptStart),
        });
      } catch (err: unknown) {
        const msg = (
          err instanceof Error ? err.message : "Connection test failed."
        )
          .replace(/[\r\n]+/g, " ")
          .slice(0, 280);

        await this.prisma.organizationAiConnection.updateMany({
          where: { id: candidate.id, organizationId: orgId },
          data: {
            lastStatus: "ERROR",
            lastError: msg,
            lastTestedAt: new Date(),
          },
        });

        attempts.push({
          connectionId: candidate.id,
          connectionName: candidate.name,
          provider: candidate.provider,
          modelId: candidate.modelId,
          ok: false,
          latencyMs: Math.max(1, Date.now() - attemptStart),
          error: msg,
        });
      }
    }

    return {
      feature: targetKey,
      mode: plan.effectiveMode,
      ok: Boolean(succeededConnectionId),
      totalLatencyMs: Math.max(1, Date.now() - totalStart),
      ...(succeededConnectionId ? { succeededConnectionId } : {}),
      attempts,
    };
  }
}
