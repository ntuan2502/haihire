import { api, getApiBaseUrl } from "./client";
import type {
  Candidate,
  CandidateNote,
  UpdateCandidateInput,
  PaginatedResult,
} from "@/types";

export const candidatesApi = {
  getAll: async (params?: {
    organizationId?: string | null;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<Candidate>> => {
    const response = await api.get<PaginatedResult<Candidate>>("/candidates", {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Candidate> => {
    const response = await api.get<Candidate>(`/candidates/${id}`);
    return response.data;
  },

  create: async (formData: FormData): Promise<Candidate> => {
    const response = await api.post<Candidate>("/candidates", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateCandidateInput,
  ): Promise<Candidate> => {
    const response = await api.patch<Candidate>(`/candidates/${id}`, data);
    return response.data;
  },

  delete: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/candidates/${id}`,
    );
    return response.data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    type?: string,
  ): Promise<Candidate> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<Candidate>(
      `/candidates/${id}/documents`,
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
  ): Promise<Candidate> => {
    const response = await api.delete<Candidate>(
      `/candidates/${id}/documents`,
      { params },
    );
    return response.data;
  },

  getDocumentDownloadUrl: (id: string, url: string, name: string): string => {
    const baseUrl = getApiBaseUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedName = encodeURIComponent(name);
    return `${baseUrl}/candidates/${id}/documents/download?url=${encodedUrl}&name=${encodedName}`;
  },

  getNotes: async (candidateId: string): Promise<CandidateNote[]> => {
    const response = await api.get<CandidateNote[]>(
      `/candidates/${candidateId}/notes`,
    );
    return response.data;
  },

  addNote: async (
    candidateId: string,
    content: string,
  ): Promise<CandidateNote> => {
    const response = await api.post<CandidateNote>(
      `/candidates/${candidateId}/notes`,
      { content },
    );
    return response.data;
  },

  updateNote: async (
    candidateId: string,
    noteId: string,
    content: string,
  ): Promise<CandidateNote> => {
    const response = await api.patch<CandidateNote>(
      `/candidates/${candidateId}/notes/${noteId}`,
      { content },
    );
    return response.data;
  },

  deleteNote: async (
    candidateId: string,
    noteId: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/candidates/${candidateId}/notes/${noteId}`,
    );
    return response.data;
  },
};
