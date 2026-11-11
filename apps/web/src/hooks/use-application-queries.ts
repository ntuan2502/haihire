"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type {
  Application,
  ApplicationNote,
  ApplicationStage,
  ApplicationStats,
  PaginatedResult,
} from "@/types";
import { queryKeys } from "./query-keys";

export function useApplications(params?: {
  organizationId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  jobId?: string;
  stage?: string;
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const effectiveOrgId =
    params?.organizationId !== undefined
      ? params.organizationId
      : user?.organizationId;

  return useQuery<PaginatedResult<Application>>({
    queryKey: queryKeys.paginatedApplications({
      orgId: effectiveOrgId,
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      jobId: params?.jobId,
      stage: params?.stage,
    }),
    queryFn: () => {
      if (!effectiveOrgId) {
        return {
          data: [],
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 20,
          totalPages: 0,
        };
      }
      return applicationsApi.getAll({
        organizationId: effectiveOrgId,
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        jobId: params?.jobId,
        stage: params?.stage,
      });
    },
    enabled: (params?.enabled ?? true) && Boolean(effectiveOrgId),
    placeholderData: keepPreviousData,
  });
}

export function useApplicationStats(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<ApplicationStats>({
    queryKey: queryKeys.applicationStats(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) {
        return {
          totalApplications: 0,
          byStage: {
            APPLIED: 0,
            SCREENING: 0,
            INTERVIEW: 0,
            OFFER: 0,
            HIRED: 0,
            REJECTED: 0,
          },
          byJob: {},
        };
      }
      return applicationsApi.getStats(effectiveOrgId);
    },
    enabled: Boolean(effectiveOrgId),
  });
}

export function useJobApplications(jobId: string | null) {
  return useQuery<Application[]>({
    queryKey: queryKeys.applications(jobId),
    queryFn: () => {
      if (!jobId) return [];
      return applicationsApi.getByJob(jobId);
    },
    enabled: jobId !== null && jobId !== undefined && jobId !== "",
  });
}

export function useApplication(id: string | null | undefined) {
  return useQuery<Application>({
    queryKey: queryKeys.application(id),
    queryFn: () => {
      if (!id) throw new Error("Application ID is required");
      return applicationsApi.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => applicationsApi.apply(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUpdateStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      stage,
      orderIndex,
      rejectionReason,
      sendRejectionEmail,
    }: {
      id: string;
      stage: ApplicationStage;
      orderIndex?: number;
      rejectionReason?: string;
      sendRejectionEmail?: boolean;
    }) =>
      applicationsApi.updateStage(id, {
        stage,
        orderIndex,
        rejectionReason,
        sendRejectionEmail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUpdateCandidateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof applicationsApi.updateCandidate>[1];
    }) => applicationsApi.updateCandidate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      file,
      type,
    }: {
      id: string;
      file: File;
      type?: string;
    }) => applicationsApi.uploadDocument(id, file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      args: { id: string; documentId?: string; url?: string } | string,
    ) => {
      if (typeof args === "string") {
        return applicationsApi.deleteDocument(args);
      }
      return applicationsApi.deleteDocument(args.id, {
        documentId: args.documentId,
        url: args.url,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useApplicationNotes(applicationId: string | null | undefined) {
  return useQuery<ApplicationNote[]>({
    queryKey: queryKeys.applicationNotes(applicationId),
    queryFn: () => {
      if (!applicationId) return [];
      return applicationsApi.getNotes(applicationId);
    },
    enabled: Boolean(applicationId),
  });
}

export function useAddApplicationNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      content,
    }: {
      applicationId: string;
      content: string;
    }) => applicationsApi.addNote(applicationId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationNotes(variables.applicationId),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateApplicationNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      noteId,
      content,
    }: {
      applicationId: string;
      noteId: string;
      content: string;
    }) => applicationsApi.updateNote(applicationId, noteId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationNotes(variables.applicationId),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useDeleteApplicationNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      noteId,
    }: {
      applicationId: string;
      noteId: string;
    }) => applicationsApi.deleteNote(applicationId, noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationNotes(variables.applicationId),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
