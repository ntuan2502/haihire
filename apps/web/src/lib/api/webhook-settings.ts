import { api } from "./client";
import type {
  WebhookSettingResponse,
  WebhookEventType,
  WebhookProviderType,
} from "@haihire/shared";

export interface CreateWebhookSettingInput {
  eventType: WebhookEventType;
  provider: WebhookProviderType;
  webhookUrl: string;
  secretToken?: string;
  chatId?: string;
  isEnabled?: boolean;
}

export interface UpdateWebhookSettingInput {
  eventType?: WebhookEventType;
  provider?: WebhookProviderType;
  webhookUrl?: string;
  secretToken?: string;
  chatId?: string;
  isEnabled?: boolean;
}

export interface TestWebhookSettingInput {
  id?: string;
  eventType?: WebhookEventType;
  provider?: WebhookProviderType;
  webhookUrl?: string;
  secretToken?: string;
  chatId?: string;
}

export const getWebhookSettings = async (): Promise<WebhookSettingResponse[]> => {
  const response = await api.get<WebhookSettingResponse[]>("/webhook-settings");
  return response.data;
};

export const getWebhookSetting = async (
  id: string,
): Promise<WebhookSettingResponse> => {
  const response = await api.get<WebhookSettingResponse>(`/webhook-settings/${id}`);
  return response.data;
};

export const createWebhookSetting = async (
  data: CreateWebhookSettingInput,
): Promise<WebhookSettingResponse> => {
  const response = await api.post<WebhookSettingResponse>("/webhook-settings", data);
  return response.data;
};

export const updateWebhookSetting = async (
  id: string,
  data: UpdateWebhookSettingInput,
): Promise<WebhookSettingResponse> => {
  const response = await api.patch<WebhookSettingResponse>(
    `/webhook-settings/${id}`,
    data,
  );
  return response.data;
};

export const deleteWebhookSetting = async (
  id: string,
): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(`/webhook-settings/${id}`);
  return response.data;
};

export const testWebhookSetting = async (
  data: TestWebhookSettingInput,
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>(
    "/webhook-settings/test",
    data,
  );
  return response.data;
};

export const webhookSettingsApi = {
  getWebhookSettings,
  getWebhookSetting,
  createWebhookSetting,
  updateWebhookSetting,
  deleteWebhookSetting,
  testWebhookSetting,
};
