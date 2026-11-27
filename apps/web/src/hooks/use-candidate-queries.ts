"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CandidateDuplicateCheckResult,
  CheckCandidateDuplicateSchema,
} from "@haihire/shared";
import {
  candidatesApi,
  type CandidatePaginatedResult,
  type CandidateSortBy,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "./use-has-permission";
import type { Candidate, CandidateNote } from "@/types";
import { keepPreviousDataForSameOrg, queryKeys } from "./query-keys";

export function useCandidates(
  organizationId?: string | null,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: string;
    jobId?: string;
    sortBy?: CandidateSortBy;
    sortOrder?: "asc" | "desc";
    enabled?: boolean;
  },
) {
  const { user } = useAuth();
  const canViewCandidates = useHasPermission("candidate:view");
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<CandidatePaginatedResult>({
    queryKey: [
      ...queryKeys.candidates(effectiveOrgId),
      options?.page,
      options?.limit,
      options?.search,
      options?.filter,
      options?.jobId,
      options?.sortBy,
      options?.sortOrder,
    ],
    queryFn: () => {
      if (!effectiveOrgId) {
        return {
          data: [],
          total: 0,
          page: 1,
          limit: options?.limit || 10,
          totalPages: 0,
          counts: { all: 0, withResume: 0, hasApplications: 0, unassigned: 0 },
        };
      }
      return candidatesApi.listPaginated({
        organizationId: effectiveOrgId,
        page: options?.page,
        limit: options?.limit,
        search: options?.search,
        filter: options?.filter,
        jobId: options?.jobId,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
      });
    },
    enabled:
      Boolean(effectiveOrgId) &&
      canViewCandidates &&
      (options?.enabled ?? true),
    placeholderData:
      keepPreviousDataForSameOrg<CandidatePaginatedResult>(effectiveOrgId),
  });
}

export function useCandidate(
  id: string | null | undefined,
  organizationId?: string | null,
) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Candidate>({
    queryKey: queryKeys.candidate(id, effectiveOrgId),
    queryFn: () => {
      if (!id) throw new Error("Candidate ID is required");
      return candidatesApi.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function useCandidateDuplicateCheck(
  params: CheckCandidateDuplicateSchema & { enabled?: boolean },
) {
  const { user } = useAuth();
  const canViewCandidates = useHasPermission("candidate:view");

  const email = params.email?.trim() || undefined;
  const phone = params.phone?.trim() || undefined;
  const firstName = params.firstName?.trim() || undefined;
  const lastName = params.lastName?.trim() || undefined;
  const dateOfBirth = params.dateOfBirth?.trim() || undefined;
  const excludeId = params.excludeId || undefined;

  const hasValidEmail = Boolean(email && email.includes("@"));
  const hasValidPhone = Boolean(phone && phone.replace(/\D/g, "").length >= 7);
  const hasValidNameDob = Boolean(firstName && lastName && dateOfBirth);
  const hasInput = hasValidEmail || hasValidPhone || hasValidNameDob;

  return useQuery<CandidateDuplicateCheckResult>({
    queryKey: [
      "candidates",
      "check-duplicate",
      { orgId: user?.organizationId ?? null },
      {
        email: hasValidEmail ? email : undefined,
        phone: hasValidPhone ? phone : undefined,
        firstName: hasValidNameDob ? firstName : undefined,
        lastName: hasValidNameDob ? lastName : undefined,
        dateOfBirth: hasValidNameDob ? dateOfBirth : undefined,
        excludeId,
      },
    ],
    queryFn: () =>
      candidatesApi.checkDuplicates({
        ...(hasValidEmail ? { email } : {}),
        ...(hasValidPhone ? { phone } : {}),
        ...(hasValidNameDob ? { firstName, lastName, dateOfBirth } : {}),
        ...(excludeId ? { excludeId } : {}),
      }),
    staleTime: 10_000,
    enabled:
      Boolean(user?.organizationId) &&
      canViewCandidates &&
      hasInput &&
      (params.enabled ?? true),
  });
}

export function useDebouncedCandidateDuplicateCheck(
  params: CheckCandidateDuplicateSchema & {
    enabled?: boolean;
    delayMs?: number;
  },
) {
  const {
    email,
    phone,
    firstName,
    lastName,
    dateOfBirth,
    excludeId,
    enabled,
    delayMs = 400,
  } = params;

  const [debounced, setDebounced] = useState({
    email,
    phone,
    firstName,
    lastName,
    dateOfBirth,
    excludeId,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({
        email,
        phone,
        firstName,
        lastName,
        dateOfBirth,
        excludeId,
      });
    }, delayMs);
    return () => clearTimeout(timer);
  }, [email, phone, firstName, lastName, dateOfBirth, excludeId, delayMs]);

  return useCandidateDuplicateCheck({
    ...debounced,
    enabled,
  });
}

export function useCreateCandidateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => candidatesApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: () => {
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.id),
      });
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
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}

export function useUploadCandidateDocumentMutation() {
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
    }) => candidatesApi.uploadDocument(id, file, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteCandidateDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      documentId,
      url,
    }: {
      id: string;
      documentId?: string;
      url?: string;
    }) => candidatesApi.deleteDocument(id, { documentId, url }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useCandidateNotes(
  candidateId: string | null | undefined,
  organizationId?: string | null,
) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<CandidateNote[]>({
    queryKey: queryKeys.candidateNotes(candidateId, effectiveOrgId),
    queryFn: () => {
      if (!candidateId) return [];
      return candidatesApi.getNotes(candidateId);
    },
    enabled: Boolean(candidateId),
  });
}

export function useAddCandidateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      candidateId,
      content,
    }: {
      candidateId: string;
      content: string;
    }) => candidatesApi.addNote(candidateId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidateNotes(variables.candidateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.candidateId),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateCandidateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      candidateId,
      noteId,
      content,
    }: {
      candidateId: string;
      noteId: string;
      content: string;
    }) => candidatesApi.updateNote(candidateId, noteId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidateNotes(variables.candidateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.candidateId),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteCandidateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      candidateId,
      noteId,
    }: {
      candidateId: string;
      noteId: string;
    }) => candidatesApi.deleteNote(candidateId, noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidateNotes(variables.candidateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidate(variables.candidateId),
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
