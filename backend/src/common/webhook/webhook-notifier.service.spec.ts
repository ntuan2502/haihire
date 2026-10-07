import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebhookNotifierService, type DlqAlertPayload } from "./webhook-notifier.service";
import { WebhookProviderFactory } from "./webhook-provider.factory";
import { Logger } from "@nestjs/common";
import { env } from "../../config/env";
import type { WebhookProvider } from "./webhook-provider.interface";
import type { PrismaService } from "../../prisma/prisma.service";
import type { EncryptionService } from "../encryption.service";

describe("WebhookNotifierService", () => {
  let service: WebhookNotifierService;

  const sampleDlqPayload: DlqAlertPayload = {
    queue: "orphan-cleanup-dlq",
    jobName: "dead-letter-cleanup",
    objectName: "tenants/org-1/resumes/permanent-orphan.pdf",
    reason: "transaction-rollback-compensation-failed",
    attemptsMade: 5,
    errorMessage: "MinIO Connection Refused (503 Service Unavailable)",
    timestamp: "2026-10-07T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookNotifierService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Case 1: when globalConfig is null (no env configured), logs warning and does not crash", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: null,
      writable: true,
      configurable: true,
    });

    const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const factorySpy = vi.spyOn(WebhookProviderFactory, "create");

    await expect(service.notifyDlq(sampleDlqPayload)).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No webhook config available, skipping alert"),
    );
    expect(factorySpy).not.toHaveBeenCalled();
  });

  it("Case 2: when globalConfig is valid, creates provider and dispatches alert message with eventId and eventType", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "DISCORD",
        url: "https://discord.com/api/webhooks/123/abc",
      },
      writable: true,
      configurable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true, statusCode: 204 }),
    };
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);

    await service.notifyDlq(sampleDlqPayload);

    expect(WebhookProviderFactory.create).toHaveBeenCalledWith({
      type: "DISCORD",
      url: "https://discord.com/api/webhooks/123/abc",
    });
    expect(mockProvider.send).toHaveBeenCalledTimes(1);

    const sentMessage = (mockProvider.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(sentMessage.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(sentMessage.eventType).toBe("DLQ_ALERT");
    expect(sentMessage.title).toBe("🚨 HaiHire DLQ Alert");
    expect(sentMessage.severity).toBe("critical");
    expect(sentMessage.fields).toHaveLength(6);
    expect(sentMessage.fields).toEqual(
      expect.arrayContaining([
        { label: "Queue", value: "orphan-cleanup-dlq" },
        { label: "Job", value: "dead-letter-cleanup" },
        { label: "Object", value: "tenants/org-1/resumes/permanent-orphan.pdf" },
        { label: "Reason", value: "transaction-rollback-compensation-failed" },
        { label: "Attempts", value: "5" },
        { label: "Error", value: "MinIO Connection Refused (503 Service Unavailable)" },
      ]),
    );
  });

  it("Case 3: logs error when provider.send returns failure result", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "TELEGRAM",
        url: "https://api.telegram.org/bot123/sendMessage",
        chatId: "123",
      },
      writable: true,
      configurable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({
        success: false,
        statusCode: 400,
        errorMessage: "Chat not found",
      }),
    };
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(service.notifyDlq(sampleDlqPayload)).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Webhook send failed: Chat not found"),
    );
  });

  it("Case 4: is non-throwing when provider.send throws an unexpected runtime exception", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "GENERIC",
        url: "https://hooks.example.com",
      },
      writable: true,
      configurable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockRejectedValue(new Error("Fatal TLS certificate validation crash")),
    };
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(service.notifyDlq(sampleDlqPayload)).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Webhook notify failed: Fatal TLS certificate validation crash"),
    );
  });

  it("Case 5: buildDlqMessage sets severity to 'warning' when attemptsMade < 5 and assigns eventType DLQ_ALERT", () => {
    const warningPayload = { ...sampleDlqPayload, attemptsMade: 3 };
    const message = service.buildDlqMessage(warningPayload);
    expect(message.severity).toBe("warning");
    expect(message.eventType).toBe("DLQ_ALERT");
    expect(message.eventId).toBeDefined();
  });

  it("Case 6: buildDlqMessage sets severity to 'critical' when attemptsMade >= 5 and assigns eventId", () => {
    const criticalPayload = { ...sampleDlqPayload, attemptsMade: 5 };
    const message = service.buildDlqMessage(criticalPayload, "12345678-1234-1234-1234-123456789abc");
    expect(message.severity).toBe("critical");
    expect(message.eventType).toBe("DLQ_ALERT");
    expect(message.eventId).toBe("12345678-1234-1234-1234-123456789abc");
  });

  it("Case 7: buildDlqMessage truncates error message longer than 500 characters", () => {
    const longError = "Z".repeat(800);
    const longPayload = { ...sampleDlqPayload, errorMessage: longError };
    const message = service.buildDlqMessage(longPayload);

    const errorField = message.fields.find((f) => f.label === "Error");
    expect(errorField?.value.length).toBe(500);
    expect(errorField?.value).toBe("Z".repeat(500));
  });

  it("Case 8: generates unique eventId on each call to notifyDlq", async () => {
    Object.defineProperty(service, "globalConfig", {
      value: {
        type: "GENERIC",
        url: "https://hooks.example.com",
      },
      writable: true,
      configurable: true,
    });

    const mockSend = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(WebhookProviderFactory, "create").mockReturnValue({ send: mockSend });

    await service.notifyDlq(sampleDlqPayload);
    await service.notifyDlq(sampleDlqPayload);

    expect(mockSend).toHaveBeenCalledTimes(2);
    const eventId1 = mockSend.mock.calls[0][0].eventId;
    const eventId2 = mockSend.mock.calls[1][0].eventId;

    expect(eventId1).toBeDefined();
    expect(eventId2).toBeDefined();
    expect(eventId1).not.toBe(eventId2);
  });

  it("Case 9: constructor initializes globalConfig when WEBHOOK_PROVIDER and WEBHOOK_URL are defined", () => {
    const origProvider = env.WEBHOOK_PROVIDER;
    const origUrl = env.WEBHOOK_URL;
    const origSecret = env.WEBHOOK_SECRET_TOKEN;
    const origChat = env.WEBHOOK_CHAT_ID;

    env.WEBHOOK_PROVIDER = "DISCORD";
    env.WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    env.WEBHOOK_SECRET_TOKEN = "secret-123";
    env.WEBHOOK_CHAT_ID = "-100111";

    try {
      const configuredService = new WebhookNotifierService();
      expect(configuredService["globalConfig"]).toEqual({
        type: "DISCORD",
        url: "https://discord.com/api/webhooks/123/abc",
        secretToken: "secret-123",
        chatId: "-100111",
      });
    } finally {
      env.WEBHOOK_PROVIDER = origProvider;
      env.WEBHOOK_URL = origUrl;
      env.WEBHOOK_SECRET_TOKEN = origSecret;
      env.WEBHOOK_CHAT_ID = origChat;
    }
  });

  it("Case 10: uses org setting and does NOT use global env when org has active settings", async () => {
    const mockDbSettings = [
      {
        id: "setting-1",
        organizationId: "org-123",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "enc:https://api.telegram.org/bot123/sendMessage",
        secretToken: null,
        chatId: "-100123",
        isEnabled: true,
      },
    ];

    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationWebhookSetting: {
              where: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue(mockDbSettings),
            },
          },
        },
      },
    };

    const mockEncryption = {
      decrypt: vi.fn((val: string) => val.replace("enc:", "")),
    };

    const orgAwareService = new WebhookNotifierService(
      mockPrisma as unknown as PrismaService,
      mockEncryption as unknown as EncryptionService,
    );

    Object.defineProperty(orgAwareService, "globalConfig", {
      value: {
        type: "DISCORD",
        url: "https://discord.com/api/webhooks/global/xyz",
      },
      writable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
    };
    const factorySpy = vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);

    await orgAwareService.notifyDlq(sampleDlqPayload, "org-123");

    expect(factorySpy).toHaveBeenCalledWith({
      type: "TELEGRAM",
      url: "https://api.telegram.org/bot123/sendMessage",
      secretToken: undefined,
      chatId: "-100123",
    });
    expect(mockProvider.send).toHaveBeenCalledTimes(1);
    // Verified global discord was NOT called
    expect(factorySpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "DISCORD" }));
  });

  it("Case 11: decrypts webhookUrl and secretToken before creating provider", async () => {
    const mockDbSettings = [
      {
        id: "setting-gen",
        organizationId: "org-123",
        eventType: "DLQ_ALERT",
        provider: "GENERIC",
        webhookUrl: "enc:https://custom-webhook.internal/dlq",
        secretToken: "enc:my-hmac-secret",
        chatId: null,
        isEnabled: true,
      },
    ];

    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationWebhookSetting: {
              where: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue(mockDbSettings),
            },
          },
        },
      },
    };

    const mockEncryption = {
      decrypt: vi.fn((val: string) => (val ? val.replace("enc:", "") : null)),
    };

    const orgAwareService = new WebhookNotifierService(
      mockPrisma as unknown as PrismaService,
      mockEncryption as unknown as EncryptionService,
    );

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
    };
    const factorySpy = vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);

    await orgAwareService.notifyDlq(sampleDlqPayload, "org-123");

    expect(mockEncryption.decrypt).toHaveBeenCalledWith("enc:https://custom-webhook.internal/dlq");
    expect(mockEncryption.decrypt).toHaveBeenCalledWith("enc:my-hmac-secret");
    expect(factorySpy).toHaveBeenCalledWith({
      type: "GENERIC",
      url: "https://custom-webhook.internal/dlq",
      secretToken: "my-hmac-secret",
      chatId: undefined,
    });
  });

  it("Case 12: falls back to global env config when org has no matching settings", async () => {
    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationWebhookSetting: {
              where: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue([]),
            },
          },
        },
      },
    };

    const mockEncryption = {
      decrypt: vi.fn(),
    };

    const orgAwareService = new WebhookNotifierService(
      mockPrisma as unknown as PrismaService,
      mockEncryption as unknown as EncryptionService,
    );

    Object.defineProperty(orgAwareService, "globalConfig", {
      value: {
        type: "DISCORD",
        url: "https://discord.com/api/webhooks/global/abc",
      },
      writable: true,
    });

    const mockProvider: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
    };
    const factorySpy = vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(mockProvider);

    await orgAwareService.notifyDlq(sampleDlqPayload, "org-without-settings");

    expect(factorySpy).toHaveBeenCalledWith({
      type: "DISCORD",
      url: "https://discord.com/api/webhooks/global/abc",
    });
    expect(mockProvider.send).toHaveBeenCalledTimes(1);
  });

  it("Case 13: sends to multiple providers when org has multiple active settings for DLQ_ALERT", async () => {
    const mockDbSettings = [
      {
        id: "setting-tg",
        organizationId: "org-multi",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "enc:https://api.telegram.org/bot1/sendMessage",
        chatId: "123",
        isEnabled: true,
      },
      {
        id: "setting-dc",
        organizationId: "org-multi",
        eventType: "DLQ_ALERT",
        provider: "DISCORD",
        webhookUrl: "enc:https://discord.com/api/webhooks/2/xyz",
        chatId: null,
        isEnabled: true,
      },
    ];

    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationWebhookSetting: {
              where: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue(mockDbSettings),
            },
          },
        },
      },
    };

    const mockEncryption = {
      decrypt: vi.fn((val: string) => val.replace("enc:", "")),
    };

    const orgAwareService = new WebhookNotifierService(
      mockPrisma as unknown as PrismaService,
      mockEncryption as unknown as EncryptionService,
    );

    const mockProviderTg: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true }),
    };
    const mockProviderDc: WebhookProvider = {
      send: vi.fn().mockResolvedValue({ success: true }),
    };

    vi.spyOn(WebhookProviderFactory, "create").mockImplementation((cfg) => {
      if (cfg.type === "TELEGRAM") return mockProviderTg;
      return mockProviderDc;
    });

    await orgAwareService.notifyDlq(sampleDlqPayload, "org-multi");

    expect(mockProviderTg.send).toHaveBeenCalledTimes(1);
    expect(mockProviderDc.send).toHaveBeenCalledTimes(1);
  });

  it("Case 14: logs warning and does not crash when org has no settings and global config is null", async () => {
    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationWebhookSetting: {
              where: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue([]),
            },
          },
        },
      },
    };

    const mockEncryption = { decrypt: vi.fn() };

    const orgAwareService = new WebhookNotifierService(
      mockPrisma as unknown as PrismaService,
      mockEncryption as unknown as EncryptionService,
    );

    Object.defineProperty(orgAwareService, "globalConfig", {
      value: null,
      writable: true,
    });

    const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    await expect(orgAwareService.notifyDlq(sampleDlqPayload, "org-empty")).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No webhook config available, skipping alert"),
    );
  });
});
