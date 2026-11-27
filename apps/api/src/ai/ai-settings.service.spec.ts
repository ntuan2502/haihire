import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppNotFoundException } from "../common/app-exception";
import { EncryptionService } from "../common/encryption.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createMockPrismaService,
  createMockTable,
} from "../test/helpers/prisma-composer-mock";
import { AiGatewayService } from "./ai-gateway.service";
import { AiSettingsService } from "./ai-settings.service";

describe("AiSettingsService", () => {
  let service: AiSettingsService;
  let gateway: AiGatewayService;
  let encryptionService: EncryptionService;
  let settingTable: ReturnType<typeof createMockTable>;
  let connectionTable: ReturnType<typeof createMockTable>;
  let routeTable: ReturnType<typeof createMockTable>;
  let auditLogMock: {
    logOrg: ReturnType<typeof vi.fn>;
    logOrgChange: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    encryptionService = new EncryptionService();
    settingTable = createMockTable([]);
    connectionTable = createMockTable([]);
    routeTable = createMockTable([]);
    auditLogMock = {
      logOrg: vi.fn().mockResolvedValue(undefined),
      logOrgChange: vi.fn().mockResolvedValue(undefined),
    };

    const mockPrisma = createMockPrismaService({
      organizationAiSetting: settingTable,
      organizationAiConnection: connectionTable,
      organizationAiFeatureRoute: routeTable,
    }) as unknown as PrismaService;

    gateway = new AiGatewayService(mockPrisma, encryptionService);
    service = new AiSettingsService(
      mockPrisma,
      encryptionService,
      gateway,
      auditLogMock as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encrypts multiple API keys, attaches first key to default route automatically, and preserves encrypted key when omitted on update", async () => {
    const initialStatus = await service.getStatus("org-1");
    expect(initialStatus.configured).toBe(false);
    expect(initialStatus.enabled).toBe(false);
    expect(initialStatus.autoScoreApplications).toBe(false);

    const conn1 = await service.createConnection("org-1", "user-1", {
      name: "Primary Gemini",
      provider: "GEMINI",
      defaultModelId: "gemini-4-hydrogen",
      apiKey: "AIzaSy-secret-key-9876",
      baseUrl: null,
      isEnabled: true,
    });

    expect(conn1.hasApiKey).toBe(true);
    expect(conn1.apiKeyLast4).toBe("9876");
    expect(
      (conn1 as unknown as Record<string, unknown>).encryptedApiKey,
    ).toBeUndefined();
    expect(JSON.stringify(conn1)).not.toContain("AIzaSy-secret-key-9876");

    const rawRow = connectionTable.store[0] as { encryptedApiKey: string };
    expect(encryptionService.decrypt(rawRow.encryptedApiKey)).toBe(
      "AIzaSy-secret-key-9876",
    );

    const overviewAfterCreate = await service.getOverview("org-1");
    expect(overviewAfterCreate.policy.defaultRouteTargets).toEqual([
      { connectionId: conn1.id, modelId: null, weight: 1 },
    ]);

    const updated = await service.updateConnection(
      "org-1",
      "user-1",
      conn1.id,
      {
        defaultModelId: "gemini-4-carbon",
      },
    );
    expect(updated.hasApiKey).toBe(true);
    expect(updated.apiKeyLast4).toBe("9876");
    expect(updated.defaultModelId).toBe("gemini-4-carbon");

    await service.updatePolicy("org-1", "user-1", {
      isEnabled: true,
      autoScoreApplications: true,
      defaultRouteMode: "SINGLE",
      defaultRouteTargets: [
        { connectionId: conn1.id, modelId: null, weight: 1 },
      ],
    });

    const status = await service.getStatus("org-1");
    expect(status.configured).toBe(true);
    expect(status.enabled).toBe(true);
    expect(status.autoScoreApplications).toBe(true);
    expect(status.features?.APPLICATION_SCORING.enabled).toBe(true);
    expect(auditLogMock.logOrgChange).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        action: "AI_CONNECTION_CREATED",
      }),
    );
    expect(auditLogMock.logOrgChange).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        action: "AI_CONNECTION_UPDATED",
      }),
    );
    expect(auditLogMock.logOrgChange).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        action: "AI_POLICY_UPDATED",
      }),
    );
  });

  it("isolates tenant AI connections, blocks SSRF URLs, and cleans deleted connections from routes", async () => {
    const connA = await service.createConnection("org-a", "user-a", {
      name: "Org A Key",
      provider: "OPENAI",
      defaultModelId: "gpt-6.2-sol",
      apiKey: "sk-org-a-1234",
      baseUrl: null,
      isEnabled: true,
    });

    const overviewB = await service.getOverview("org-b");
    expect(overviewB.connections).toHaveLength(0);
    await expect(
      service.updateConnection("org-b", "user-b", connA.id, { name: "Hijack" }),
    ).rejects.toBeInstanceOf(AppNotFoundException);

    await expect(
      service.createConnection("org-b", "user-b", {
        name: "SSRF Attempt",
        provider: "OPENAI_COMPATIBLE",
        defaultModelId: "llama3.1",
        baseUrl: "http://169.254.169.254/latest/meta-data",
        isEnabled: true,
      }),
    ).rejects.toMatchObject({
      code: APP_ERROR_CODES.VALIDATION_ERROR,
    });

    await service.updateFeatureRoutes("org-a", "user-a", {
      routes: [
        {
          feature: "APPLICATION_SCORING",
          isEnabled: true,
          mode: "SINGLE",
          targets: [
            { connectionId: connA.id, modelId: "gpt-6.2-astra", weight: 1 },
          ],
        },
      ],
    });

    const del = await service.deleteConnection("org-a", "user-a", connA.id);
    expect(del.deleted).toBe(true);

    const afterDelete = await service.getOverview("org-a");
    expect(afterDelete.connections).toHaveLength(0);
    expect(afterDelete.policy.defaultRouteTargets).toEqual([]);
    const scoringRoute = afterDelete.routes.find(
      (r) => r.feature === "APPLICATION_SCORING",
    );
    expect(scoringRoute?.targets).toEqual([]);
    expect(scoringRoute?.mode).toBe("INHERIT_DEFAULT");
  });

  it("tests stored connection health, per-feature enable toggles, and proxy route tests", async () => {
    const conn1 = await service.createConnection("org-1", "user-1", {
      name: "OpenAI Test",
      provider: "OPENAI",
      defaultModelId: "gpt-6.2-sol",
      apiKey: "sk-live-test-4321",
      baseUrl: null,
      isEnabled: true,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "OK" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const testRes = await service.testConnection("org-1", {
      connectionId: conn1.id,
      provider: "OPENAI",
      modelId: "gpt-6.2-sol",
      baseUrl: null,
    });
    expect(testRes.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.updateFeatureRoutes("org-1", "user-1", {
      routes: [
        {
          feature: "SCREENING_QUESTIONS",
          isEnabled: false,
          mode: "INHERIT_DEFAULT",
          targets: [],
        },
      ],
    });

    const status = await service.getStatus("org-1");
    expect(status.features?.SCREENING_QUESTIONS.enabled).toBe(false);
    expect(status.features?.APPLICATION_SCORING.enabled).toBe(true);

    const routeTest = await service.testFeatureRoute(
      "org-1",
      "APPLICATION_SCORING",
    );
    expect(routeTest.ok).toBe(true);
    expect(routeTest.attempts).toHaveLength(1);
    expect(routeTest.attempts[0].connectionId).toBe(conn1.id);
  });
});
