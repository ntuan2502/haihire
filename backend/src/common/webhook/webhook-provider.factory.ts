import type {
  WebhookProvider,
  WebhookProviderConfig,
} from "./webhook-provider.interface";
import { TelegramProvider } from "./providers/telegram.provider";
import { DiscordProvider } from "./providers/discord.provider";
import { GenericWebhookProvider } from "./providers/generic-webhook.provider";

export class WebhookProviderFactory {
  static create(config: WebhookProviderConfig): WebhookProvider {
    switch (config.type) {
      case "TELEGRAM":
        return new TelegramProvider(config);
      case "DISCORD":
        return new DiscordProvider(config);
      case "GENERIC":
        return new GenericWebhookProvider(config);
      default:
        throw new Error(`Unknown webhook provider: ${(config as { type: string }).type}`);
    }
  }
}
