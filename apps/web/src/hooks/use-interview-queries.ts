"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { interviewsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type {
  Interview,
  CreateInterviewInput,
  UpdateInterviewInput,
  PaginatedResult,
} from "@/types";
import { queryKeys } from "./query-keys";

export function useInterviews(params?: {
  organizationId?: string | null;
  jobId?: string | null;
  applicationId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  tab?: string;
  sortBy?: string;
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const effectiveOrgId =
    params?.organizationId !== undefined
      ? params.organizationId
      : user?.organizationId;

  return useQuery<PaginatedResult<Interview>>({
    queryKey: queryKeys.interviews({
      orgId: effectiveOrgId,
      jobId: params?.jobId,
      applicationId: params?.applicationId,
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      tab: params?.tab,
      sortBy: params?.sortBy,
    }),
    queryFn: () => {
      if (!effectiveOrgId) {
        return {
          data: [],
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 15,
          totalPages: 0,
        };
      }
      return interviewsApi.getAll({
        organizationId: effectiveOrgId || undefined,
        jobId: params?.jobId || undefined,
        applicationId: params?.applicationId || undefined,
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        tab: params?.tab,
        sortBy: params?.sortBy,
      });
    },
    enabled: Boolean(effectiveOrgId) && (params?.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

export function useInterview(id: string | null | undefined) {
  return useQuery<Interview>({
    queryKey: queryKeys.interview(id),
    queryFn: () => {
      if (!id) throw new Error("Interview ID is required");
      return interviewsApi.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateInterviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInterviewInput) => interviewsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUpdateInterviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInterviewInput }) =>
      interviewsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interview(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interview(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useDeleteInterviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => interviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
