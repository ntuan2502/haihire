import {
  IsIn,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
} from "class-validator";
import {
  type WebhookEventType,
  type WebhookProviderType,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROVIDER_TYPES,
} from "@haihire/shared";
import { IsProviderConfigValidConstraint } from "../webhook-settings.validator";

export class CreateWebhookSettingDto {
  @IsIn(WEBHOOK_EVENT_TYPES)
  @IsNotEmpty()
  eventType: WebhookEventType;

  @IsIn(WEBHOOK_PROVIDER_TYPES)
  @IsNotEmpty()
  provider: WebhookProviderType;

  @IsString()
  @IsNotEmpty()
  @Validate(IsProviderConfigValidConstraint)
  webhookUrl: string;

  @IsString()
  @IsOptional()
  secretToken?: string;

  @IsString()
  @IsOptional()
  chatId?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
