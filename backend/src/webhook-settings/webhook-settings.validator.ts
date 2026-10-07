import {
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from "class-validator";
import type { WebhookProviderType } from "@haihire/shared";

export const TELEGRAM_URL_REGEX = /^https:\/\/api\.telegram\.org\/bot[a-zA-Z0-9:_-]+\/sendMessage$/;
export const DISCORD_URL_REGEX = /^https:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[a-zA-Z0-9:_-]+$/;

export function validateWebhookProviderConfig(
  provider: WebhookProviderType,
  webhookUrl: string,
  chatId?: string | null,
  _secretToken?: string | null,
): string | null {
  if (!webhookUrl || typeof webhookUrl !== "string") {
    return "webhookUrl must be a string";
  }

  const trimmedUrl = webhookUrl.trim();

  // Allow masked URLs during update
  if (trimmedUrl.includes("***")) {
    return null;
  }

  if (provider === "TELEGRAM") {
    if (!TELEGRAM_URL_REGEX.test(trimmedUrl)) {
      return "webhookUrl for Telegram must match https://api.telegram.org/bot<token>/sendMessage";
    }
    if (!chatId || typeof chatId !== "string" || chatId.trim() === "") {
      return "chatId is required for Telegram webhooks";
    }
  } else if (provider === "DISCORD") {
    if (!DISCORD_URL_REGEX.test(trimmedUrl)) {
      return "webhookUrl for Discord must match https://discord.com/api/webhooks/<id>/<token>";
    }
    if (chatId && typeof chatId === "string" && chatId.trim() !== "") {
      return "chatId must not be provided for Discord webhooks";
    }
  } else if (provider === "GENERIC") {
    if (!trimmedUrl.startsWith("https://")) {
      return "webhookUrl for Generic webhook must use HTTPS";
    }
    try {
      new URL(trimmedUrl);
    } catch {
      return "webhookUrl must be a valid URL";
    }
    if (chatId && typeof chatId === "string" && chatId.trim() !== "") {
      return "chatId must not be provided for Generic webhooks";
    }
  } else {
    return `Unsupported provider: ${provider}`;
  }

  return null;
}

export function maskWebhookUrl(url: string, provider: WebhookProviderType): string {
  if (!url) return "";
  if (url.includes("***")) return url;

  if (provider === "TELEGRAM") {
    return "https://api.telegram.org/bot***/sendMessage";
  }

  if (provider === "DISCORD") {
    const match = url.match(/^https:\/\/discord\.com\/api\/webhooks\/([0-9]+)\//);
    if (match) {
      return `https://discord.com/api/webhooks/${match[1]}/***`;
    }
    return "https://discord.com/api/webhooks/***";
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}/***`;
  } catch {
    return "https://***";
  }
}

@ValidatorConstraint({ name: "isProviderConfigValid", async: false })
export class IsProviderConfigValidConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as {
      provider?: WebhookProviderType;
      webhookUrl?: string;
      chatId?: string;
      secretToken?: string;
    };
    if (!obj.provider || !obj.webhookUrl) {
      return false;
    }
    return (
      validateWebhookProviderConfig(
        obj.provider,
        obj.webhookUrl,
        obj.chatId,
        obj.secretToken,
      ) === null
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as {
      provider?: WebhookProviderType;
      webhookUrl?: string;
      chatId?: string;
      secretToken?: string;
    };
    if (!obj.provider || !obj.webhookUrl) {
      return "Invalid webhook configuration";
    }
    return (
      validateWebhookProviderConfig(
        obj.provider,
        obj.webhookUrl,
        obj.chatId,
        obj.secretToken,
      ) || "Invalid webhook configuration"
    );
  }
}
