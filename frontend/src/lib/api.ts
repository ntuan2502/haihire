import axios from "axios";
import type { Application, CreateJobInput, Job } from "../types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const jobsApi = {
  getAll: async (params?: {
    status?: string;
    department?: string;
    search?: string;
  }): Promise<Job[]> => {
    const response = await api.get<Job[]>("/jobs", { params });
    return response.data;
  },

  getById: async (id: number): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  create: async (data: CreateJobInput): Promise<Job> => {
    const response = await api.post<Job>("/jobs", data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateJobInput>): Promise<Job> => {
    const response = await api.patch<Job>(`/jobs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};

export const applicationsApi = {
  getByJob: async (jobId: number): Promise<Application[]> => {
    const response = await api.get<Application[]>(`/applications/job/${jobId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Application> => {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  apply: async (formData: FormData): Promise<Application> => {
    const response = await api.post<Application>(
      "/applications/apply",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  updateStage: async (
    id: number,
    stage: string,
    orderIndex = 0,
  ): Promise<Application> => {
    const response = await api.patch<Application>(
      `/applications/${id}/stage`,
      { stage, orderIndex },
    );
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },
};
