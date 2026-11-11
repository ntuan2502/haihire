import { api } from "./client";
import type {
  Application,
  ApplicationNote,
  ApplicationStats,
  PaginatedResult,
  UpdateApplicationStageInput,
} from "@/types";

export const applicationsApi = {
  getAll: async (params?: {
    organizationId?: string;
    page?: number;
    limit?: number;
    search?: string;
    jobId?: string;
    stage?: string;
  }): Promise<PaginatedResult<Application>> => {
    const response = await api.get<PaginatedResult<Application>>(
      "/applications",
      { params },
    );
    return response.data;
  },

  getStats: async (organizationId?: string): Promise<ApplicationStats> => {
    const response = await api.get<ApplicationStats>("/applications/stats", {
      params: organizationId ? { organizationId } : undefined,
    });
    return response.data;
  },

  getByJob: async (
    jobId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<Application[]> => {
    const response = await api.get<Application[]>(
      `/applications/job/${jobId}`,
      { params },
    );
    return response.data;
  },

  getById: async (id: string): Promise<Application> => {
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
    id: string,
    stageOrOptions: string | UpdateApplicationStageInput,
    orderIndex = 0,
  ): Promise<Application> => {
    const payload =
      typeof stageOrOptions === "string"
        ? { stage: stageOrOptions, orderIndex }
        : {
            stage: stageOrOptions.stage,
            orderIndex: stageOrOptions.orderIndex ?? orderIndex,
            ...(stageOrOptions.rejectionReason !== undefined
              ? { rejectionReason: stageOrOptions.rejectionReason }
              : {}),
            ...(stageOrOptions.sendRejectionEmail !== undefined
              ? { sendRejectionEmail: stageOrOptions.sendRejectionEmail }
              : {}),
          };
    const response = await api.patch<Application>(
      `/applications/${id}/stage`,
      payload,
    );
    return response.data;
  },

  updateCandidate: async (
    id: string,
    data: {
      candidateName?: string;
      candidateEmail?: string;
      candidatePhone?: string;
      resumeUrl?: string;
      resumeFileName?: string;
    },
  ): Promise<Application> => {
    const response = await api.patch<Application>(`/applications/${id}`, data);
    return response.data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    type?: string,
  ): Promise<Application> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<Application>(
      `/applications/${id}/documents`,
      formData,
      {
        params: type ? { type } : undefined,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  deleteDocument: async (
    id: string,
    params?: { documentId?: string; url?: string },
  ): Promise<Application> => {
    const response = await api.delete<Application>(
      `/applications/${id}/documents`,
      { params },
    );
    return response.data;
  },

  delete: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },

  getNotes: async (applicationId: string): Promise<ApplicationNote[]> => {
    const response = await api.get<ApplicationNote[]>(
      `/applications/${applicationId}/notes`,
    );
    return response.data;
  },

  addNote: async (
    applicationId: string,
    content: string,
  ): Promise<ApplicationNote> => {
    const response = await api.post<ApplicationNote>(
      `/applications/${applicationId}/notes`,
      { content },
    );
    return response.data;
  },

  updateNote: async (
    applicationId: string,
    noteId: string,
    content: string,
  ): Promise<ApplicationNote> => {
    const response = await api.patch<ApplicationNote>(
      `/applications/${applicationId}/notes/${noteId}`,
      { content },
    );
    return response.data;
  },

  deleteNote: async (
    applicationId: string,
    noteId: string,
  ): Promise<{ success: boolean; id: string }> => {
    const response = await api.delete<{ success: boolean; id: string }>(
      `/applications/${applicationId}/notes/${noteId}`,
    );
    return response.data;
  },
};
