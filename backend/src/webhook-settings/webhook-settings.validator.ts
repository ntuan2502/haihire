import {
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from "class-validator";
import type { WebhookProviderType } from "@haihire/shared";
import { validateWebhookDestination } from "../common/webhook/webhook-http";

export function validateWebhookProviderConfig(
  provider: WebhookProviderType,
  webhookUrl: string,
  chatId?: string | null,
  _secretToken?: string | null,
): string | null {
  if (!webhookUrl || typeof webhookUrl !== "string") {
    return "webhookUrl must be a string";
  }

  const destinationError = validateWebhookDestination(
    provider,
    webhookUrl.trim(),
  );
  if (destinationError) return destinationError;

  if (provider === "TELEGRAM") {
    if (!chatId || typeof chatId !== "string" || chatId.trim() === "") {
      return "chatId is required for Telegram webhooks";
    }
  } else if (provider === "DISCORD") {
    if (chatId && typeof chatId === "string" && chatId.trim() !== "") {
      return "chatId must not be provided for Discord webhooks";
    }
  } else if (provider === "GENERIC") {
    if (chatId && typeof chatId === "string" && chatId.trim() !== "") {
      return "chatId must not be provided for Generic webhooks";
    }
  }

  return null;
}

export function maskWebhookUrl(
  url: string,
  provider: WebhookProviderType,
): string {
  if (!url) return "";

  if (provider === "TELEGRAM") {
    return "https://api.telegram.org/bot***/sendMessage";
  }

  if (provider === "DISCORD") {
    const match = url.match(
      /^https:\/\/discord\.com\/api\/webhooks\/([0-9]+)\//,
    );
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
