"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { jobsApi, organizationsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { Job, Organization, PaginatedResult } from "@/types";
import { queryKeys } from "./query-keys";

export function useJobs(
  organizationId?: string | null,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    department?: string;
    type?: string;
    experienceLevel?: string;
    workplace?: string;
    sortBy?: string;
    sortOrder?: string;
    organizationSlug?: string | null;
  },
) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<PaginatedResult<Job>>({
    queryKey: [
      ...queryKeys.jobs(effectiveOrgId),
      options?.page,
      options?.limit,
      options?.search,
      options?.status,
      options?.department,
      options?.type,
      options?.experienceLevel,
      options?.workplace,
      options?.sortBy,
      options?.sortOrder,
      options?.organizationSlug,
    ],
    queryFn: async () => {
      if (!effectiveOrgId && !options?.organizationSlug) {
        return {
          data: [],
          total: 0,
          page: 1,
          limit: options?.limit || 15,
          totalPages: 0,
        };
      }
      return jobsApi.getAll({
        organizationId: effectiveOrgId,
        organizationSlug: options?.organizationSlug,
        page: options?.page,
        limit: options?.limit,
        search: options?.search,
        status: options?.status,
        department: options?.department,
        type: options?.type,
        experienceLevel: options?.experienceLevel,
        workplace: options?.workplace,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
      });
    },
    enabled: Boolean(effectiveOrgId || options?.organizationSlug),
    placeholderData: keepPreviousData,
  });
}

export function useAllJobs(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Job[]>({
    queryKey: ["jobs", "all", effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const res = await jobsApi.getAll({ organizationId: effectiveOrgId, limit: 1000 });
      return res.data;
    },
    enabled: Boolean(effectiveOrgId),
  });
}

export function useOpenJobs(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Job[]>({
    queryKey: ["jobs", "open", effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const res = await jobsApi.getAll({
        organizationId: effectiveOrgId,
        status: "PUBLISHED",
        limit: 1000,
      });
      return res.data;
    },
    enabled: Boolean(effectiveOrgId),
  });
}

export function useJob(id: string | null) {
  return useQuery<Job>({
    queryKey: ["jobs", id],
    queryFn: () => {
      if (!id) throw new Error("Job ID is required");
      return jobsApi.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function usePublicOrg(slug: string | null) {
  return useQuery<Organization>({
    queryKey: ["organization", "public", slug],
    queryFn: () => {
      if (!slug) throw new Error("Organization slug is required");
      return organizationsApi.getPublicOrg(slug);
    },
    enabled: Boolean(slug),
  });
}

export function useAllPublicJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs", "public-all-published"],
    queryFn: async () => {
      const res = await jobsApi.getAll({ status: "PUBLISHED", limit: 1000 });
      return res.data;
    },
  });
}

export function usePublicJobs(orgSlug: string | null) {
  return useQuery<Job[]>({
    queryKey: ["jobs", "public-list", orgSlug],
    queryFn: async () => {
      if (!orgSlug) return [];
      const res = await jobsApi.getAll({ organizationSlug: orgSlug, status: "PUBLISHED", limit: 1000 });
      return res.data;
    },
    enabled: Boolean(orgSlug),
  });
}

export function usePublicJob(orgSlug: string | null, jobSlug: string | null) {
  return useQuery<Job>({
    queryKey: ["jobs", "public-detail", orgSlug, jobSlug],
    queryFn: () => {
      if (!orgSlug || !jobSlug) throw new Error("Org slug and Job slug are required");
      return jobsApi.getBySlug(orgSlug, jobSlug);
    },
    enabled: Boolean(orgSlug && jobSlug),
  });
}

export function useUpdateJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof jobsApi.update>[1];
    }) => jobsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", variables.id] });
    },
  });
}

export function useCreateJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof jobsApi.create>[0]) =>
      jobsApi.create(data),
    onSuccess: () => {
      // Invalidate all jobs queries to instantly refresh
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useDeleteJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
