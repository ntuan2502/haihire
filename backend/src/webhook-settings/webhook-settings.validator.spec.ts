import { describe, it, expect } from "vitest";
import type { ValidationArguments } from "class-validator";
import type { WebhookProviderType } from "@haihire/shared";
import {
  validateWebhookProviderConfig,
  maskWebhookUrl,
  IsProviderConfigValidConstraint,
} from "./webhook-settings.validator";

describe("WebhookSettingsValidator", () => {
  describe("validateWebhookProviderConfig", () => {
    it("rejects non-string webhookUrl", () => {
      expect(
        validateWebhookProviderConfig("TELEGRAM", null as unknown as string),
      ).toBe("webhookUrl must be a string");
    });

    it("allows masked URLs during update", () => {
      expect(
        validateWebhookProviderConfig(
          "TELEGRAM",
          "https://api.telegram.org/bot***/sendMessage",
        ),
      ).toBeNull();
    });

    it("validates Telegram URL format and chatId", () => {
      expect(
        validateWebhookProviderConfig(
          "TELEGRAM",
          "https://api.telegram.org/invalid",
          "-100",
        ),
      ).toContain("must match https://api.telegram.org/bot<token>/sendMessage");

      expect(
        validateWebhookProviderConfig(
          "TELEGRAM",
          "https://api.telegram.org/bot123/sendMessage",
          "",
        ),
      ).toBe("chatId is required for Telegram webhooks");

      expect(
        validateWebhookProviderConfig(
          "TELEGRAM",
          "https://api.telegram.org/bot123/sendMessage",
          "12345",
        ),
      ).toBeNull();
    });

    it("validates Discord URL format and rejects chatId", () => {
      expect(
        validateWebhookProviderConfig(
          "DISCORD",
          "https://discord.com/api/invalid",
        ),
      ).toContain("must match https://discord.com/api/webhooks/<id>/<token>");

      expect(
        validateWebhookProviderConfig(
          "DISCORD",
          "https://discord.com/api/webhooks/123/abc",
          "forbidden-chat-id",
        ),
      ).toBe("chatId must not be provided for Discord webhooks");

      expect(
        validateWebhookProviderConfig(
          "DISCORD",
          "https://discord.com/api/webhooks/123/abc",
        ),
      ).toBeNull();
    });

    it("validates Generic URL HTTPS protocol and rejects chatId", () => {
      expect(
        validateWebhookProviderConfig(
          "GENERIC",
          "http://insecure.com/webhook",
        ),
      ).toBe("webhookUrl for Generic webhook must use HTTPS");

      expect(
        validateWebhookProviderConfig(
          "GENERIC",
          "https://valid.com/webhook",
          "not-allowed",
        ),
      ).toBe("chatId must not be provided for Generic webhooks");

      expect(
        validateWebhookProviderConfig(
          "GENERIC",
          "https://valid.com/webhook",
        ),
      ).toBeNull();
    });

    it("rejects unsupported provider", () => {
      expect(
        validateWebhookProviderConfig(
          "SLACK" as unknown as WebhookProviderType,
          "https://hooks.slack.com",
        ),
      ).toContain("Unsupported provider");
    });
  });

  describe("maskWebhookUrl", () => {
    it("handles empty and already masked URLs", () => {
      expect(maskWebhookUrl("", "TELEGRAM")).toBe("");
      expect(maskWebhookUrl("https://masked.com/***", "GENERIC")).toBe(
        "https://masked.com/***",
      );
    });

    it("masks Telegram bot tokens", () => {
      expect(
        maskWebhookUrl(
          "https://api.telegram.org/bot123456:SECRET/sendMessage",
          "TELEGRAM",
        ),
      ).toBe("https://api.telegram.org/bot***/sendMessage");
    });

    it("masks Discord webhook tokens", () => {
      expect(
        maskWebhookUrl(
          "https://discord.com/api/webhooks/123456789/mySecretToken",
          "DISCORD",
        ),
      ).toBe("https://discord.com/api/webhooks/123456789/***");

      expect(maskWebhookUrl("https://discord.com/other", "DISCORD")).toBe(
        "https://discord.com/api/webhooks/***",
      );
    });

    it("masks Generic URLs preserving origin", () => {
      expect(
        maskWebhookUrl("https://example.com/api/v1/hook?token=123", "GENERIC"),
      ).toBe("https://example.com/***");
    });
  });

  describe("IsProviderConfigValidConstraint", () => {
    const validator = new IsProviderConfigValidConstraint();

    it("returns false and defaultMessage when provider or webhookUrl missing", () => {
      const args = { object: {} } as unknown as ValidationArguments;
      expect(validator.validate(null, args)).toBe(false);
      expect(validator.defaultMessage(args)).toBe(
        "Invalid webhook configuration",
      );
    });

    it("returns true when configuration is valid", () => {
      const args = {
        object: {
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot123/sendMessage",
          chatId: "-100",
        },
      } as unknown as ValidationArguments;
      expect(validator.validate(null, args)).toBe(true);
    });

    it("returns specific error message on invalid configuration", () => {
      const args = {
        object: {
          provider: "TELEGRAM",
          webhookUrl: "https://api.telegram.org/bot123/sendMessage",
          // missing chatId
        },
      } as unknown as ValidationArguments;
      expect(validator.validate(null, args)).toBe(false);
      expect(validator.defaultMessage(args)).toBe(
        "chatId is required for Telegram webhooks",
      );
    });
  });
});
