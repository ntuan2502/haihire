"use client";

import { useQuery } from "@tanstack/react-query";
import { activitiesApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { ActivityEvent } from "@/lib/email-templates";
import { queryKeys } from "./query-keys";

export interface PaginatedActivitiesResult {
  data: ActivityEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useCandidateActivities(
  candidateId?: string | null,
  params?: {
    organizationId?: string | null;
    page?: number;
    limit?: number;
  },
) {
  const { user } = useAuth();
  const effectiveOrgId =
    params?.organizationId !== undefined ? params.organizationId : user?.organizationId;

  return useQuery<PaginatedActivitiesResult>({
    queryKey: queryKeys.candidateActivities(
      candidateId,
      effectiveOrgId,
      params?.page,
      params?.limit,
    ),
    queryFn: async () => {
      if (!candidateId) {
        return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      return activitiesApi.getByCandidate(candidateId, {
        organizationId: effectiveOrgId,
        page: params?.page,
        limit: params?.limit,
      });
    },
    enabled: Boolean(candidateId),
  });
}

export function useApplicationActivities(
  applicationId?: string | null,
  params?: {
    organizationId?: string | null;
    page?: number;
    limit?: number;
  },
) {
  const { user } = useAuth();
  const effectiveOrgId =
    params?.organizationId !== undefined ? params.organizationId : user?.organizationId;

  return useQuery<PaginatedActivitiesResult>({
    queryKey: queryKeys.applicationActivities(
      applicationId,
      effectiveOrgId,
      params?.page,
      params?.limit,
    ),
    queryFn: async () => {
      if (!applicationId) {
        return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      return activitiesApi.getByApplication(applicationId, {
        organizationId: effectiveOrgId,
        page: params?.page,
        limit: params?.limit,
      });
    },
    enabled: Boolean(applicationId),
  });
}
