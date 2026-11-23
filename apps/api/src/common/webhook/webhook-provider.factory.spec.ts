import { describe, it, expect } from "vitest";
import { WebhookProviderFactory } from "./webhook-provider.factory";
import { TelegramProvider } from "./providers/telegram.provider";
import { DiscordProvider } from "./providers/discord.provider";
import { GenericWebhookProvider } from "./providers/generic-webhook.provider";
import type { WebhookProviderConfig } from "./webhook-provider.interface";

describe("WebhookProviderFactory", () => {
  it("Case 1: instantiates TelegramProvider when type is 'TELEGRAM'", () => {
    const config: WebhookProviderConfig = {
      type: "TELEGRAM",
      url: "https://api.telegram.org/bot123/sendMessage",
      chatId: "123456",
    };
    const provider = WebhookProviderFactory.create(config);
    expect(provider).toBeInstanceOf(TelegramProvider);
  });

  it("Case 2: instantiates DiscordProvider when type is 'DISCORD'", () => {
    const config: WebhookProviderConfig = {
      type: "DISCORD",
      url: "https://discord.com/api/webhooks/123/abc",
    };
    const provider = WebhookProviderFactory.create(config);
    expect(provider).toBeInstanceOf(DiscordProvider);
  });

  it("Case 3: instantiates GenericWebhookProvider when type is 'GENERIC'", () => {
    const config: WebhookProviderConfig = {
      type: "GENERIC",
      url: "https://hooks.custom.com/webhook",
      secretToken: "secret",
    };
    const provider = WebhookProviderFactory.create(config);
    expect(provider).toBeInstanceOf(GenericWebhookProvider);
  });

  it("Case 4: throws descriptive Error when provider type is unrecognized", () => {
    const invalidConfig = {
      type: "TEAMS",
      url: "https://outlook.office.com/webhook",
    } as unknown as WebhookProviderConfig;

    expect(() => WebhookProviderFactory.create(invalidConfig)).toThrow(
      "Unknown webhook provider: TEAMS",
    );
  });
});
