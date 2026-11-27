import type {
  AiConnectionResponse,
  AiFeatureRouteResponse,
  AiPolicyResponse,
  AiRouteTestTarget,
  CreateAiConnectionInput,
  OrganizationAiOverviewResponse,
  OrganizationAiStatusResponse,
  TestAiConnectionInput,
  TestAiConnectionResponse,
  TestAiRouteResponse,
  UpdateAiConnectionInput,
  UpdateAiFeatureRoutesInput,
  UpdateAiPolicyInput,
} from "@haihire/shared";
import { api } from "./client";

export const aiSettingsApi = {
  getStatus: async (): Promise<OrganizationAiStatusResponse> => {
    const response = await api.get<OrganizationAiStatusResponse>(
      "/ai-settings/status",
    );
    return response.data;
  },

  getOverview: async (): Promise<OrganizationAiOverviewResponse> => {
    const response =
      await api.get<OrganizationAiOverviewResponse>("/ai-settings");
    return response.data;
  },

  updatePolicy: async (
    data: UpdateAiPolicyInput,
  ): Promise<AiPolicyResponse> => {
    const response = await api.put<AiPolicyResponse>(
      "/ai-settings/policy",
      data,
    );
    return response.data;
  },

  createConnection: async (
    data: CreateAiConnectionInput,
  ): Promise<AiConnectionResponse> => {
    const response = await api.post<AiConnectionResponse>(
      "/ai-settings/connections",
      data,
    );
    return response.data;
  },

  updateConnection: async (
    id: string,
    data: UpdateAiConnectionInput,
  ): Promise<AiConnectionResponse> => {
    const response = await api.patch<AiConnectionResponse>(
      `/ai-settings/connections/${encodeURIComponent(id)}`,
      data,
    );
    return response.data;
  },

  deleteConnection: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await api.delete<{ deleted: boolean }>(
      `/ai-settings/connections/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  testConnection: async (
    data: TestAiConnectionInput,
  ): Promise<TestAiConnectionResponse> => {
    const response = await api.post<TestAiConnectionResponse>(
      "/ai-settings/connections/test",
      data,
    );
    return response.data;
  },

  updateRoutes: async (
    data: UpdateAiFeatureRoutesInput,
  ): Promise<AiFeatureRouteResponse[]> => {
    const response = await api.put<AiFeatureRouteResponse[]>(
      "/ai-settings/routes",
      data,
    );
    return response.data;
  },

  testRoute: async (
    feature: AiRouteTestTarget,
  ): Promise<TestAiRouteResponse> => {
    const response = await api.post<TestAiRouteResponse>(
      `/ai-settings/routes/${encodeURIComponent(feature)}/test`,
    );
    return response.data;
  },
};
