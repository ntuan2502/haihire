import { api } from "./client";
import type {
  Interview,
  CreateInterviewInput,
  UpdateInterviewInput,
  PaginatedResult,
} from "@/types";
import type { InterviewScorecard } from "../interviews";

export const interviewsApi = {
  getAll: async (params?: {
    organizationId?: string;
    jobId?: string;
    applicationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    search?: string;
    tab?: string;
    sortBy?: string;
  }): Promise<PaginatedResult<Interview>> => {
    const response = await api.get<PaginatedResult<Interview>>("/interviews", {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Interview> => {
    const response = await api.get<Interview>(`/interviews/${id}`);
    return response.data;
  },

  create: async (data: CreateInterviewInput): Promise<Interview> => {
    const response = await api.post<Interview>("/interviews", data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateInterviewInput,
  ): Promise<Interview> => {
    const response = await api.patch<Interview>(`/interviews/${id}`, data);
    return response.data;
  },

  submitScorecard: async (
    id: string,
    scorecard: InterviewScorecard | Record<string, unknown> | string,
  ): Promise<Interview> => {
    const response = await api.patch<Interview>(`/interviews/${id}/scorecard`, {
      scorecard,
    });
    return response.data;
  },

  delete: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/interviews/${id}`);
    return response.data;
  },
};
