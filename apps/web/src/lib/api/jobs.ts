import { api } from "./client";
import type { Job, CreateJobInput, PaginatedResult } from "@/types";

export const jobsApi = {
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

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};
