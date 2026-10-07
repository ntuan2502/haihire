import {
  IsIn,
  IsOptional,
  IsString,
} from "class-validator";
import {
  type WebhookEventType,
  type WebhookProviderType,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROVIDER_TYPES,
} from "@haihire/shared";

export class TestWebhookSettingDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsIn(WEBHOOK_EVENT_TYPES)
  @IsOptional()
  eventType?: WebhookEventType;

  @IsIn(WEBHOOK_PROVIDER_TYPES)
  @IsOptional()
  provider?: WebhookProviderType;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  secretToken?: string;

  @IsString()
  @IsOptional()
  chatId?: string;
}
