import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import { EncryptionService } from "../common/encryption.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createMockPrismaService,
  createMockTable,
} from "../test/helpers/prisma-composer-mock";
import { AiSettingsService } from "./ai-settings.service";

describe("AiSettingsService", () => {
  let service: AiSettingsService;
  let encryptionService: EncryptionService;
  let aiTable: ReturnType<typeof createMockTable>;
  let auditLogMock: { logOrg: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    encryptionService = new EncryptionService();
    aiTable = createMockTable([]);
    auditLogMock = { logOrg: vi.fn().mockResolvedValue(undefined) };

    const mockPrisma = createMockPrismaService({
      organizationAiSetting: aiTable,
    }) as unknown as PrismaService;

    service = new AiSettingsService(
      mockPrisma,
      encryptionService,
      auditLogMock as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encrypts API keys with AES-256-GCM, masks key in responses, and preserves key when omitted on update", async () => {
    const initialStatus = await service.getStatus("org-1");
    expect(initialStatus).toEqual({
      configured: false,
      enabled: false,
      autoScoreApplications: false,
    });

    const created = await service.upsertSetting("org-1", "user-1", {
      provider: "GEMINI",
      modelId: "gemini-2.5-flash",
      apiKey: "AIzaSy-secret-key-9876",
      baseUrl: null,
      isEnabled: true,
      autoScoreApplications: false,
    });

    expect(created.hasApiKey).toBe(true);
    expect(created.apiKeyLast4).toBe("9876");
    expect(
      (created as unknown as Record<string, unknown>).encryptedApiKey,
    ).toBeUndefined();
    expect(JSON.stringify(created)).not.toContain("AIzaSy-secret-key-9876");

    // Stored encrypted payload decrypts cleanly back to original key
    const rawRow = aiTable.store[0] as { encryptedApiKey: string };
    expect(rawRow.encryptedApiKey).not.toBe("AIzaSy-secret-key-9876");
    expect(encryptionService.decrypt(rawRow.encryptedApiKey)).toBe(
      "AIzaSy-secret-key-9876",
    );

    // Update model without resending apiKey -> keeps encrypted key
    const updated = await service.upsertSetting("org-1", "user-1", {
      provider: "GEMINI",
      modelId: "gemini-2.5-pro",
      baseUrl: null,
      isEnabled: true,
      autoScoreApplications: true,
    });
    expect(updated.hasApiKey).toBe(true);
    expect(updated.apiKeyLast4).toBe("9876");
    expect(updated.modelId).toBe("gemini-2.5-pro");
    expect(updated.autoScoreApplications).toBe(true);

    const status = await service.getStatus("org-1");
    expect(status.autoScoreApplications).toBe(true);

    const runtime = await service.getActiveRuntimeConfig("org-1");
    expect(runtime.apiKey).toBe("AIzaSy-secret-key-9876");
  });

  it("isolates tenant AI settings and blocks metadata SSRF URLs", async () => {
    await service.upsertSetting("org-a", "user-a", {
      provider: "OPENAI",
      modelId: "gpt-4o-mini",
      apiKey: "sk-org-a-1234",
      baseUrl: null,
      isEnabled: true,
      autoScoreApplications: false,
    });

    expect(await service.getSetting("org-b")).toBeNull();
    await expect(service.getActiveRuntimeConfig("org-b")).rejects.toThrow(
      AppBadRequestException,
    );

    await expect(
      service.upsertSetting("org-b", "user-b", {
        provider: "OPENAI_COMPATIBLE",
        modelId: "llama3.1",
        baseUrl: "http://169.254.169.254/latest/meta-data",
        isEnabled: true,
        autoScoreApplications: false,
      }),
    ).rejects.toMatchObject({
      code: APP_ERROR_CODES.VALIDATION_ERROR,
    });
  });

  it("tests connection using stored encrypted key or explicit key and deletes cleanly", async () => {
    await service.upsertSetting("org-1", "user-1", {
      provider: "OPENAI",
      modelId: "gpt-4o-mini",
      apiKey: "sk-live-test-4321",
      baseUrl: null,
      isEnabled: true,
      autoScoreApplications: false,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "OK" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await service.testConnection("org-1", {
      provider: "OPENAI",
      modelId: "gpt-4o-mini",
      baseUrl: null,
    });
    expect(res.ok).toBe(true);
    expect(res.model).toBe("gpt-4o-mini");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const del = await service.deleteSetting("org-1", "user-1");
    expect(del.deleted).toBe(true);
    expect(await service.getSetting("org-1")).toBeNull();
  });
});
