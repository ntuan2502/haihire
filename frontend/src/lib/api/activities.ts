import { api } from "./client";
import type { ActivityEvent } from "../email-templates";

export const activitiesApi = {
  getByCandidate: async (
    candidateId: string,
    params?: { organizationId?: string | null; page?: number; limit?: number },
  ) => {
    const response = await api.get<{
      data: ActivityEvent[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/activities/candidate/${candidateId}`, {
      params: {
        organizationId: params?.organizationId || undefined,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  getByApplication: async (
    applicationId: string,
    params?: { organizationId?: string | null; page?: number; limit?: number },
  ) => {
    const response = await api.get<{
      data: ActivityEvent[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/activities/application/${applicationId}`, {
      params: {
        organizationId: params?.organizationId || undefined,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post("/activities", data);
    return response.data;
  },
};
