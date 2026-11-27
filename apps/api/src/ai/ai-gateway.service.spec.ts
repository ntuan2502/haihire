import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import { EncryptionService } from "../common/encryption.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createMockPrismaService,
  createMockTable,
} from "../test/helpers/prisma-composer-mock";
import { AiGatewayService } from "./ai-gateway.service";

describe("AiGatewayService (Multi-Key Proxy, Failover & Load Balance)", () => {
  let gateway: AiGatewayService;
  let encryptionService: EncryptionService;
  let settingTable: ReturnType<typeof createMockTable>;
  let connectionTable: ReturnType<typeof createMockTable>;
  let routeTable: ReturnType<typeof createMockTable>;

  const conn1Id = "11111111-1111-4111-8111-111111111111";
  const conn2Id = "22222222-2222-4222-8222-222222222222";
  const conn3Id = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    encryptionService = new EncryptionService();
    settingTable = createMockTable([
      {
        id: "setting-1",
        organizationId: "org-1",
        isEnabled: true,
        autoScoreApplications: false,
        defaultRouteMode: "FAILOVER",
        defaultRouteTargets: [
          { connectionId: conn1Id, modelId: null, weight: 1 },
          { connectionId: conn2Id, modelId: "gpt-6.2-astra", weight: 1 },
        ],
      },
    ]);
    connectionTable = createMockTable([
      {
        id: conn1Id,
        organizationId: "org-1",
        name: "Gemini Primary",
        provider: "GEMINI",
        defaultModelId: "gemini-4-hydrogen",
        encryptedApiKey: encryptionService.encrypt("AIza-primary"),
        apiKeyLast4: "mary",
        baseUrl: null,
        isEnabled: true,
        lastStatus: "UNTESTED",
        consecutiveFailures: 0,
      },
      {
        id: conn2Id,
        organizationId: "org-1",
        name: "OpenAI Backup",
        provider: "OPENAI",
        defaultModelId: "gpt-5-mini",
        encryptedApiKey: encryptionService.encrypt("sk-backup"),
        apiKeyLast4: "ckup",
        baseUrl: null,
        isEnabled: true,
        lastStatus: "UNTESTED",
        consecutiveFailures: 0,
      },
      {
        id: conn3Id,
        organizationId: "org-1",
        name: "OpenRouter Pool",
        provider: "OPENROUTER",
        defaultModelId: "google/gemini-4-hydrogen",
        encryptedApiKey: encryptionService.encrypt("sk-or-pool"),
        apiKeyLast4: "pool",
        baseUrl: null,
        isEnabled: true,
        lastStatus: "UNTESTED",
        consecutiveFailures: 0,
      },
    ]);
    routeTable = createMockTable([]);

    const mockPrisma = createMockPrismaService({
      organizationAiSetting: settingTable,
      organizationAiConnection: connectionTable,
      organizationAiFeatureRoute: routeTable,
    }) as unknown as PrismaService;

    gateway = new AiGatewayService(mockPrisma, encryptionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails over on 429 rate limit, sets cooldown, and uses per-target model override on #2", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "Rate limit exceeded" } }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const result = await gateway.execute("org-1", "SCREENING_QUESTIONS", {
      systemPrompt: "Sys",
      userPrompt: "User",
      jsonMode: true,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.connectionId).toBe(conn2Id);
    expect(result.provider).toBe("OPENAI");
    expect(result.modelId).toBe("gpt-6.2-astra");
    expect(result.attempts).toBe(2);

    const cooldowns = await gateway.getCooldownRemainingSeconds("org-1", [
      conn1Id,
      conn2Id,
    ]);
    expect(cooldowns[conn1Id]).toBeGreaterThan(0);
    expect(cooldowns[conn2Id]).toBe(0);

    // Next call prefers conn2 immediately while conn1 is in cooldown
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "second-ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const nextRes = await gateway.execute("org-1", "SCREENING_QUESTIONS", {
      systemPrompt: "Sys",
      userPrompt: "User",
    });
    expect(nextRes.connectionId).toBe(conn2Id);
    expect(nextRes.attempts).toBe(1);
  });

  it("distributes weighted round-robin traffic in LOAD_BALANCE mode and adapts pdfAttachment across providers", async () => {
    routeTable.store.push({
      id: "route-score",
      organizationId: "org-1",
      feature: "APPLICATION_SCORING",
      isEnabled: true,
      mode: "LOAD_BALANCE",
      targets: [
        { connectionId: conn1Id, modelId: null, weight: 2 },
        { connectionId: conn3Id, modelId: null, weight: 1 },
      ],
    });

    const promptFlags: boolean[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("generativelanguage")) {
          return new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: "gemini-ok" }] } }],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "openrouter-ok" } }],
          }),
          { status: 200 },
        );
      });

    const r1 = await gateway.execute("org-1", "APPLICATION_SCORING", {
      systemPrompt: "Sys",
      buildUserPrompt: (supportsPdf) => {
        promptFlags.push(supportsPdf);
        return supportsPdf ? "pdf-mode" : "text-mode";
      },
      pdfAttachment: { base64: "JVBERi0=", filename: "cv.pdf" },
    });
    const r2 = await gateway.execute("org-1", "APPLICATION_SCORING", {
      systemPrompt: "Sys",
      buildUserPrompt: (supportsPdf) => {
        promptFlags.push(supportsPdf);
        return supportsPdf ? "pdf-mode" : "text-mode";
      },
      pdfAttachment: { base64: "JVBERi0=", filename: "cv.pdf" },
    });
    const r3 = await gateway.execute("org-1", "APPLICATION_SCORING", {
      systemPrompt: "Sys",
      buildUserPrompt: (supportsPdf) => {
        promptFlags.push(supportsPdf);
        return supportsPdf ? "pdf-mode" : "text-mode";
      },
      pdfAttachment: { base64: "JVBERi0=", filename: "cv.pdf" },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    // Slots: [conn1, conn1, conn3] -> weights 2:1 across 3 calls
    expect([r1.connectionId, r2.connectionId, r3.connectionId]).toEqual([
      conn1Id,
      conn1Id,
      conn3Id,
    ]);
    // GEMINI supports PDF attachment (true); OPENROUTER falls back to extracted text (false)
    expect(promptFlags).toEqual([true, true, false]);
  });

  it("blocks execution when a specific feature toggle is disabled and throws AI_ALL_PROVIDERS_FAILED when all fail", async () => {
    routeTable.store.push({
      id: "route-criteria",
      organizationId: "org-1",
      feature: "SCORING_CRITERIA",
      isEnabled: false,
      mode: "INHERIT_DEFAULT",
      targets: [],
    });

    await expect(
      gateway.execute("org-1", "SCORING_CRITERIA", {
        systemPrompt: "Sys",
        userPrompt: "User",
      }),
    ).rejects.toMatchObject({
      code: APP_ERROR_CODES.AI_NOT_CONFIGURED,
    });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("err1", { status: 500 }))
      .mockResolvedValueOnce(new Response("err2", { status: 401 }));

    let caught: unknown;
    try {
      await gateway.execute("org-1", "SCREENING_QUESTIONS", {
        systemPrompt: "Sys",
        userPrompt: "User",
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AppBadRequestException);
    expect((caught as AppBadRequestException).code).toBe(
      APP_ERROR_CODES.AI_ALL_PROVIDERS_FAILED,
    );
  });

  it("skips decrypting stored API keys when resolveFeatureStatus inspects route readiness", async () => {
    const decryptSpy = vi.spyOn(encryptionService, "decrypt");
    const status = await gateway.resolveFeatureStatus(
      "org-1",
      "APPLICATION_SCORING",
    );
    expect(status.enabled).toBe(true);
    expect(status.activeTargetCount).toBe(2);
    expect(decryptSpy).not.toHaveBeenCalled();
  });
});
