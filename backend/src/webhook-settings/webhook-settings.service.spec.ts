import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookSettingsService } from "./webhook-settings.service";
import { WebhookProviderFactory } from "../common/webhook/webhook-provider.factory";
import type { WebhookProvider } from "../common/webhook/webhook-provider.interface";
import type { PrismaService } from "../prisma/prisma.service";
import type { EncryptionService } from "../common/encryption.service";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";

type MockPrisma = {
  db: {
    orm: {
      public: {
        OrganizationWebhookSetting: {
          where: ReturnType<typeof vi.fn>;
          all: ReturnType<typeof vi.fn>;
          first: ReturnType<typeof vi.fn>;
          create: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
        };
      };
    };
  };
};

type MockEncryption = {
  encrypt: ReturnType<typeof vi.fn>;
  decrypt: ReturnType<typeof vi.fn>;
  mask: ReturnType<typeof vi.fn>;
};

describe("WebhookSettingsService", () => {
  let service: WebhookSettingsService;
  let mockPrisma: MockPrisma;
  let mockEncryption: MockEncryption;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationWebhookSetting: {
              where: vi.fn().mockImplementation((predicate: unknown) => {
                if (typeof predicate === "function") {
                  predicate({
                    id: { eq: vi.fn() },
                    organizationId: { eq: vi.fn() },
                    eventType: { eq: vi.fn() },
                    provider: { eq: vi.fn() },
                  });
                }
                return mockPrisma.db.orm.public.OrganizationWebhookSetting;
              }),
              all: vi.fn().mockResolvedValue([]),
              first: vi.fn().mockResolvedValue(null),
              create: vi.fn().mockImplementation((data) =>
                Promise.resolve({
                  ...data,
                  createdAt: 1775534400000,
                  updatedAt: 1775534400000,
                }),
              ),
              update: vi.fn().mockImplementation((data) =>
                Promise.resolve({
                  id: "setting-1",
                  organizationId: "org-1",
                  eventType: "DLQ_ALERT",
                  provider: "TELEGRAM",
                  webhookUrl: "enc:https://api.telegram.org/bot999/sendMessage",
                  secretToken: null,
                  chatId: "-100999",
                  isEnabled: true,
                  createdAt: 1775534400000,
                  updatedAt: 1775534400000,
                  createdBy: "user-1",
                  updatedBy: "user-1",
                  ...data,
                }),
              ),
              delete: vi.fn().mockResolvedValue({ count: 1 }),
            },
          },
        },
      },
    };

    mockEncryption = {
      encrypt: vi.fn((val: string) => `enc:${val}`),
      decrypt: vi.fn((val: string) =>
        val.startsWith("enc:") ? val.replace("enc:", "") : val,
      ),
      mask: vi.fn(() => "••••••••••••••••"),
    };

    service = new WebhookSettingsService(
      mockPrisma as unknown as PrismaService,
      mockEncryption as unknown as EncryptionService,
    );
  });

  describe("create", () => {
    it("Case 1: Happy path creates Telegram webhook with encrypted URL and returns masked URL", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);

      const result = await service.create("org-1", "user-1", {
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
        chatId: "-100123456789",
        isEnabled: true,
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
      );
      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          eventType: "DLQ_ALERT",
          provider: "TELEGRAM",
          webhookUrl: "enc:https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
          chatId: "-100123456789",
        }),
      );
      expect(result.webhookUrl).toBe("https://api.telegram.org/bot***/sendMessage");
      expect(result.provider).toBe("TELEGRAM");
      expect(result.chatId).toBe("-100123456789");
    });

    it("Case 2: Happy path creates Generic webhook and encrypts secretToken", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);

      const result = await service.create("org-1", "user-1", {
        eventType: "JOB_POSTED",
        provider: "GENERIC",
        webhookUrl: "https://my-company.com/api/webhooks/jobs",
        secretToken: "super-secret-hmac-key",
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith("super-secret-hmac-key");
      expect(result.webhookUrl).toBe("https://my-company.com/***");
      expect(result.secretToken).toBe("••••••••••••••••");
    });

    it("Case 3: Throws validation error when TELEGRAM is missing chatId", async () => {
      await expect(
        service.create("org-1", "user-1", {
          eventType: "DLQ_ALERT",
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot123/sendMessage",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 4: Throws validation error when DISCORD includes chatId", async () => {
      await expect(
        service.create("org-1", "user-1", {
          eventType: "DLQ_ALERT",
          provider: "DISCORD",
          webhookUrl: "https://discord.com/api/webhooks/123456/abcdef",
          chatId: "should-not-be-here",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 5: Throws validation error when GENERIC URL does not use HTTPS", async () => {
      await expect(
        service.create("org-1", "user-1", {
          eventType: "DLQ_ALERT",
          provider: "GENERIC",
          webhookUrl: "http://insecure.example.com/webhook",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 6: Throws error when duplicate [organizationId, eventType, provider] already exists", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "existing-id",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
      });

      await expect(
        service.create("org-1", "user-1", {
          eventType: "DLQ_ALERT",
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot123/sendMessage",
          chatId: "-1001",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });
  });

  describe("findAll & findOne", () => {
    it("Case 7: findAll returns list of masked settings for the organization", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.all.mockResolvedValue([
        {
          id: "s-1",
          organizationId: "org-1",
          eventType: "DLQ_ALERT",
          provider: "TELEGRAM",
          webhookUrl: "enc:https://api.telegram.org/bot123/sendMessage",
          secretToken: null,
          chatId: "-100",
          isEnabled: true,
          createdAt: 1775534400000,
          updatedAt: 1775534400000,
          createdBy: "u1",
          updatedBy: "u1",
        },
        {
          id: "s-2",
          organizationId: "org-1",
          eventType: "ORPHAN_SPIKE",
          provider: "DISCORD",
          webhookUrl: "enc:https://discord.com/api/webhooks/999/secrettoken",
          secretToken: null,
          chatId: null,
          isEnabled: true,
          createdAt: 1775534400000,
          updatedAt: 1775534400000,
          createdBy: "u1",
          updatedBy: "u1",
        },
      ]);

      const list = await service.findAll("org-1");
      expect(list).toHaveLength(2);
      expect(list[0].webhookUrl).toBe("https://api.telegram.org/bot***/sendMessage");
      expect(list[1].webhookUrl).toBe("https://discord.com/api/webhooks/999/***");
    });

    it("Case 8: findOne returns masked setting", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "s-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "GENERIC",
        webhookUrl: "enc:https://hooks.slack.com/services/T00/B00/X00",
        secretToken: "enc:mysecret",
        chatId: null,
        isEnabled: true,
        createdAt: 1775534400000,
        updatedAt: 1775534400000,
      });

      const res = await service.findOne("s-1", "org-1");
      expect(res.webhookUrl).toBe("https://hooks.slack.com/***");
      expect(res.secretToken).toBe("••••••••••••••••");
    });

    it("Case 9: findOne blocks cross-tenant access", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "s-1",
        organizationId: "org-2", // different org
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
      });

      await expect(service.findOne("s-1", "org-1")).rejects.toThrow(
        AppForbiddenException,
      );
    });

    it("Case 10: findOne throws 404 when setting not found", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);

      await expect(service.findOne("non-existent", "org-1")).rejects.toThrow(
        AppNotFoundException,
      );
    });
  });

  describe("update & delete", () => {
    it("Case 11: update preserves existing encrypted URL when masked URL is passed", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "enc:https://api.telegram.org/bot999/sendMessage",
        chatId: "-100999",
      });

      await service.update("setting-1", "org-1", "user-1", {
        webhookUrl: "https://api.telegram.org/bot***/sendMessage", // masked URL from UI
        isEnabled: false,
      });

      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ webhookUrl: expect.anything() }),
      );
      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({ isEnabled: false }),
      );
    });

    it("Case 12: update rejects cross-tenant modification", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-OTHER",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
      });

      await expect(
        service.update("setting-1", "org-1", "user-1", { isEnabled: false }),
      ).rejects.toThrow(AppForbiddenException);
    });

    it("Case 13: delete successfully removes setting from DB", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
      });

      const res = await service.delete("setting-1", "org-1");
      expect(res).toEqual({ success: true });
      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.delete).toHaveBeenCalled();
    });
  });

  describe("testConnection", () => {
    it("Case 14: tests connection with ad-hoc parameters successfully", async () => {
      const mockProvider = {
        send: vi.fn().mockResolvedValue({ success: true, statusCode: 200 }),
      };
      vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(
        mockProvider as unknown as WebhookProvider,
      );

      const res = await service.testConnection("org-1", {
        eventType: "DLQ_ALERT",
        provider: "DISCORD",
        webhookUrl: "https://discord.com/api/webhooks/123/xyz",
      });

      expect(res.success).toBe(true);
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "🔔 HaiHire Webhook Test",
          eventType: "DLQ_ALERT",
        }),
      );
    });

    it("Case 15: tests connection using stored setting ID and decrypted credentials", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-db",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "enc:https://api.telegram.org/bot123/sendMessage",
        chatId: "-100123",
      });

      const mockProvider = {
        send: vi.fn().mockResolvedValue({ success: true }),
      };
      const factorySpy = vi
        .spyOn(WebhookProviderFactory, "create")
        .mockReturnValue(mockProvider as unknown as WebhookProvider);

      const res = await service.testConnection("org-1", {
        id: "setting-db",
      });

      expect(res.success).toBe(true);
      expect(factorySpy).toHaveBeenCalledWith({
        type: "TELEGRAM",
        url: "https://api.telegram.org/bot123/sendMessage",
        chatId: "-100123",
        secretToken: undefined,
      });
    });

    it("Case 16: throws WEBHOOK_TEST_FAILED when provider returns failure", async () => {
      const mockProvider = {
        send: vi.fn().mockResolvedValue({
          success: false,
          errorMessage: "Invalid Bot Token",
        }),
      };
      vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(
        mockProvider as unknown as WebhookProvider,
      );

      await expect(
        service.testConnection("org-1", {
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot123/sendMessage",
          chatId: "-1001",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 17: update with new unmasked URL validates and encrypts it", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "enc:https://api.telegram.org/botold/sendMessage",
        chatId: "-1001",
      });

      await service.update("setting-1", "org-1", "user-1", {
        webhookUrl: "https://api.telegram.org/botnew-token:123/sendMessage",
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        "https://api.telegram.org/botnew-token:123/sendMessage",
      );
      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookUrl: "enc:https://api.telegram.org/botnew-token:123/sendMessage",
        }),
      );
    });

    it("Case 18: update with secretToken handles new secret, empty string, and masked string", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-gen",
        organizationId: "org-1",
        eventType: "JOB_POSTED",
        provider: "GENERIC",
        webhookUrl: "enc:https://example.com/hook",
        secretToken: "enc:old-secret",
      });

      // 1. New secret
      await service.update("setting-gen", "org-1", "user-1", {
        secretToken: "brand-new-secret",
      });
      expect(mockEncryption.encrypt).toHaveBeenCalledWith("brand-new-secret");

      // 2. Empty secret clears it
      await service.update("setting-gen", "org-1", "user-1", {
        secretToken: "",
      });
      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({ secretToken: null }),
      );

      // 3. Masked secret keeps existing
      await service.update("setting-gen", "org-1", "user-1", {
        secretToken: "••••••••••••••••",
      });
      expect(mockPrisma.db.orm.public.OrganizationWebhookSetting.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ secretToken: expect.anything() }),
      );
    });

    it("Case 19: update eventType throws conflict error when duplicate exists", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first
        .mockResolvedValueOnce({
          id: "setting-1",
          organizationId: "org-1",
          eventType: "DLQ_ALERT",
          provider: "TELEGRAM",
        })
        .mockResolvedValueOnce({
          id: "setting-2", // different existing setting with target eventType
          organizationId: "org-1",
          eventType: "JOB_POSTED",
          provider: "TELEGRAM",
        });

      await expect(
        service.update("setting-1", "org-1", "user-1", {
          eventType: "JOB_POSTED",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 20: update throws 404 when setting does not exist", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);

      await expect(
        service.update("non-existent", "org-1", "user-1", { isEnabled: true }),
      ).rejects.toThrow(AppNotFoundException);
    });

    it("Case 21: delete throws 404 when setting not found", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);

      await expect(service.delete("missing", "org-1")).rejects.toThrow(
        AppNotFoundException,
      );
    });

    it("Case 22: delete throws 403 on cross-tenant deletion attempt", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-OTHER",
      });

      await expect(service.delete("setting-1", "org-1")).rejects.toThrow(
        AppForbiddenException,
      );
    });

    it("Case 23: testConnection throws 400 when missing provider or webhookUrl", async () => {
      await expect(service.testConnection("org-1", {})).rejects.toThrow(
        AppBadRequestException,
      );
    });

    it("Case 24: testConnection throws 400 when provider config validation fails", async () => {
      await expect(
        service.testConnection("org-1", {
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot123/sendMessage",
          // missing chatId
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 25: testConnection throws 403 when stored setting belongs to another org", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-cross",
        organizationId: "org-OTHER",
      });

      await expect(
        service.testConnection("org-1", { id: "setting-cross" }),
      ).rejects.toThrow(AppForbiddenException);
    });

    it("Case 26: testConnection handles unexpected exception from provider.send", async () => {
      const mockProvider = {
        send: vi.fn().mockRejectedValue(new Error("Network timeout")),
      };
      vi.spyOn(WebhookProviderFactory, "create").mockReturnValue(
        mockProvider as unknown as WebhookProvider,
      );

      await expect(
        service.testConnection("org-1", {
          provider: "DISCORD",
          webhookUrl: "https://discord.com/api/webhooks/123/xyz",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 27: testConnection throws error when stored webhookUrl decryption fails", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-corrupt",
        organizationId: "org-1",
        provider: "TELEGRAM",
        webhookUrl: "invalid-cipher-text",
      });
      mockEncryption.decrypt.mockReturnValue(null);

      await expect(
        service.testConnection("org-1", { id: "setting-corrupt" }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 29: update throws AppNotFoundException when update returns null", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
      });
      mockPrisma.db.orm.public.OrganizationWebhookSetting.update.mockResolvedValue(null);

      await expect(
        service.update("setting-1", "org-1", "user-1", { isEnabled: true }),
      ).rejects.toThrow(AppNotFoundException);
    });

    it("Case 30: testConnection throws 404 when stored setting ID is not found", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);

      await expect(
        service.testConnection("org-1", { id: "non-existent-id" }),
      ).rejects.toThrow(AppNotFoundException);
    });

    it("Case 31: methods throw 403 when organizationId is missing or empty", async () => {
      await expect(service.findAll("")).rejects.toThrow(AppForbiddenException);
      await expect(service.findOne("setting-1", "")).rejects.toThrow(
        AppForbiddenException,
      );
      await expect(
        service.create("", "user-1", {
          eventType: "DLQ_ALERT",
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot1/sendMessage",
          chatId: "123",
        }),
      ).rejects.toThrow(AppForbiddenException);
      await expect(
        service.update("setting-1", "", "user-1", { isEnabled: false }),
      ).rejects.toThrow(AppForbiddenException);
      await expect(service.delete("setting-1", "")).rejects.toThrow(
        AppForbiddenException,
      );
      await expect(service.testConnection("", {})).rejects.toThrow(
        AppForbiddenException,
      );
    });

    it("Case 32: testConnection using stored setting ID decrypts secretToken when present", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-generic",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "GENERIC",
        webhookUrl: "enc:https://custom-webhook.com/alert",
        secretToken: "enc:my-hmac-secret",
      });

      const mockProvider = {
        send: vi.fn().mockResolvedValue({ success: true }),
      };
      const factorySpy = vi
        .spyOn(WebhookProviderFactory, "create")
        .mockReturnValue(mockProvider as unknown as WebhookProvider);

      const res = await service.testConnection("org-1", {
        id: "setting-generic",
      });

      expect(res.success).toBe(true);
      expect(factorySpy).toHaveBeenCalledWith({
        type: "GENERIC",
        url: "https://custom-webhook.com/alert",
        chatId: undefined,
        secretToken: "my-hmac-secret",
      });
    });

    it("Case 33: update throws 400 WEBHOOK_PROVIDER_MISMATCH when new webhookUrl violates provider validation", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "enc:https://api.telegram.org/bot123/sendMessage",
        chatId: "-100",
      });

      await expect(
        service.update("setting-1", "org-1", "user-1", {
          webhookUrl: "https://invalid-telegram-url.com",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 34: update provider without webhookUrl throws when existing URL is incompatible with new provider", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "GENERIC",
        webhookUrl: "enc:https://generic-api.com/hooks",
      });

      // Changing to TELEGRAM requires https://api.telegram.org/bot... and chatId
      await expect(
        service.update("setting-1", "org-1", "user-1", {
          provider: "TELEGRAM",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 35: update provider without webhookUrl succeeds when existing URL is compatible and handles decrypt error", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "GENERIC",
        webhookUrl: "https://discord.com/api/webhooks/123/xyz",
      });
      mockEncryption.decrypt.mockImplementationOnce(() => {
        throw new Error("Decrypt error");
      });

      const res = await service.update("setting-1", "org-1", "user-1", {
        provider: "DISCORD",
      });

      expect(res.provider).toBe("DISCORD");
    });

    it("Case 36: create throws 400 when encryptionService fails to encrypt URL", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue(null);
      mockEncryption.encrypt.mockReturnValueOnce(null);

      await expect(
        service.create("org-1", "user-1", {
          eventType: "DLQ_ALERT",
          provider: "DISCORD",
          webhookUrl: "https://discord.com/api/webhooks/123/xyz",
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it("Case 37: mapToResponse gracefully falls back to raw URL when decrypt throws", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first.mockResolvedValue({
        id: "setting-fallback",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "GENERIC",
        webhookUrl: "https://raw-url.com/hook",
        createdAt: 1775534400000,
        updatedAt: 1775534400000,
      });
      mockEncryption.decrypt.mockImplementationOnce(() => {
        throw new Error("Key failure");
      });

      const res = await service.findOne("setting-fallback", "org-1");
      expect(res.webhookUrl).toBe("https://raw-url.com/***");
    });

    it("Case 38: update allows provider/eventType change when conflict check returns the same record (self)", async () => {
      mockPrisma.db.orm.public.OrganizationWebhookSetting.first
        .mockResolvedValueOnce({
          id: "setting-1",
          organizationId: "org-1",
          eventType: "DLQ_ALERT",
          provider: "GENERIC",
          webhookUrl: "enc:https://example.com/api",
        })
        .mockResolvedValueOnce({
          // conflict query returns same record
          id: "setting-1",
          organizationId: "org-1",
          eventType: "JOB_POSTED",
          provider: "GENERIC",
        });

      const res = await service.update("setting-1", "org-1", "user-1", {
        eventType: "JOB_POSTED",
      });

      expect(res).toBeDefined();
    });
  });
});
