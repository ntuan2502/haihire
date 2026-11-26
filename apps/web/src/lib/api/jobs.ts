import { api } from "./client";
import type {
  GenerateScoringCriteriaInput,
  GenerateScoringCriteriaResponse,
  GenerateScreeningQuestionsInput,
  GenerateScreeningQuestionsResponse,
  Job,
  CreateJobInput,
  PaginatedResult,
  PipelineStageItem,
  UpsertPipelineStagesSchema,
} from "@/types";

export const jobsApi = {
  getPublic: async (params?: {
    limit?: number;
  }): Promise<PaginatedResult<Job>> => {
    const response = await api.get<PaginatedResult<Job>>("/jobs/public", {
      params,
    });
    return response.data;
  },
  getAll: async (params?: {
    status?: string;
    department?: string;
    search?: string;
    type?: string;
    experienceLevel?: string;
    workplace?: string;
    sortBy?: string;
    sortOrder?: string;
    organizationId?: string | null;
    organizationSlug?: string | null;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Job>> => {
    const response = await api.get<PaginatedResult<Job>>("/jobs", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  getBySlug: async (orgSlug: string, jobSlug: string): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/careers/${orgSlug}/${jobSlug}`);
    return response.data;
  },

  create: async (data: CreateJobInput): Promise<Job> => {
    const response = await api.post<Job>("/jobs", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateJobInput>): Promise<Job> => {
    const response = await api.patch<Job>(`/jobs/${id}`, data);
    return response.data;
  },

  delete: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  getStages: async (id: string): Promise<PipelineStageItem[]> => {
    const response = await api.get<PipelineStageItem[]>(`/jobs/${id}/stages`);
    return response.data;
  },

  updateStages: async (
    id: string,
    data: UpsertPipelineStagesSchema,
  ): Promise<PipelineStageItem[]> => {
    const response = await api.patch<PipelineStageItem[]>(
      `/jobs/${id}/stages`,
      data,
    );
    return response.data;
  },

  generateScreeningQuestions: async (
    data: GenerateScreeningQuestionsInput,
  ): Promise<GenerateScreeningQuestionsResponse> => {
    const response = await api.post<GenerateScreeningQuestionsResponse>(
      "/jobs/screening-questions/generate",
      data,
    );
    return response.data;
  },

  generateScoringCriteria: async (
    data: GenerateScoringCriteriaInput,
  ): Promise<GenerateScoringCriteriaResponse> => {
    const response = await api.post<GenerateScoringCriteriaResponse>(
      "/jobs/generate-scoring-criteria",
      data,
    );
    return response.data;
  },
};
