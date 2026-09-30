"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { candidatesApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { Candidate, PaginatedResult } from "@/types";
import { queryKeys } from "./query-keys";

export function useCandidates(
  organizationId?: string | null,
  options?: { page?: number; limit?: number; search?: string },
) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<PaginatedResult<Candidate>>({
    queryKey: [
      ...queryKeys.candidates(effectiveOrgId),
      options?.page,
      options?.limit,
      options?.search,
    ],
    queryFn: () => {
      if (!effectiveOrgId) {
        return {
          data: [],
          total: 0,
          page: 1,
          limit: options?.limit || 10,
          totalPages: 0,
        };
      }
      return candidatesApi.getAll({
        organizationId: effectiveOrgId,
        page: options?.page,
        limit: options?.limit,
        search: options?.search,
      });
    },
    enabled: Boolean(effectiveOrgId),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(id: string | null | undefined) {
  return useQuery<Candidate>({
    queryKey: queryKeys.candidate(id),
    queryFn: () => {
      if (!id) throw new Error("Candidate ID is required");
      return candidatesApi.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateCandidateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => candidatesApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useUpdateCandidateDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof candidatesApi.update>[1];
    }) => candidatesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidate(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useDeleteCandidateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => candidatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}

export function useUploadCandidateDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file, type }: { id: string; file: File; type?: string }) =>
      candidatesApi.uploadDocument(id, file, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidate(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteCandidateDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, documentId, url }: { id: string; documentId?: string; url?: string }) =>
      candidatesApi.deleteDocument(id, { documentId, url }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidate(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
