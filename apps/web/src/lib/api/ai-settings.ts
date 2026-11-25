import type {
  OrganizationAiSettingResponse,
  OrganizationAiStatusResponse,
  TestAiConnectionInput,
  TestAiConnectionResponse,
  UpsertAiSettingInput,
} from "@haihire/shared";
import { api } from "./client";

export const aiSettingsApi = {
  getStatus: async (): Promise<OrganizationAiStatusResponse> => {
    const response = await api.get<OrganizationAiStatusResponse>(
      "/ai-settings/status",
    );
    return response.data;
  },

  getSetting: async (): Promise<OrganizationAiSettingResponse | null> => {
    const response = await api.get<OrganizationAiSettingResponse | null>(
      "/ai-settings",
    );
    return response.data;
  },

  upsertSetting: async (
    data: UpsertAiSettingInput,
  ): Promise<OrganizationAiSettingResponse> => {
    const response = await api.put<OrganizationAiSettingResponse>(
      "/ai-settings",
      data,
    );
    return response.data;
  },

  deleteSetting: async (): Promise<{ deleted: boolean }> => {
    const response = await api.delete<{ deleted: boolean }>("/ai-settings");
    return response.data;
  },

  testConnection: async (
    data: TestAiConnectionInput,
  ): Promise<TestAiConnectionResponse> => {
    const response = await api.post<TestAiConnectionResponse>(
      "/ai-settings/test",
      data,
    );
    return response.data;
  },
};
