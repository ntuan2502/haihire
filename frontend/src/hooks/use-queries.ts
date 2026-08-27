"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi, applicationsApi } from "@/lib/api";
import type { Job, Application, ApplicationStage } from "@/types";

// ==========================================
// QUERY KEYS
// ==========================================
export const queryKeys = {
  jobs: (orgId?: number | null) => ["jobs", { orgId }] as const,
  applications: (jobId?: number | null) => ["applications", { jobId }] as const,
  allApplications: () => ["applications", "all"] as const,
};

// ==========================================
// JOBS HOOKS
// ==========================================
export function useJobs(organizationId?: number | null) {
  return useQuery<Job[]>({
    queryKey: queryKeys.jobs(organizationId),
    queryFn: () =>
      jobsApi.getAll(
        organizationId !== undefined && organizationId !== null
          ? { organizationId }
          : undefined,
      ),
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
    mutationFn: (id: number) => jobsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

// ==========================================
// APPLICATIONS HOOKS
// ==========================================
export function useAllApplications() {
  return useQuery<Application[]>({
    queryKey: queryKeys.allApplications(),
    queryFn: () => applicationsApi.getAll(),
  });
}

export function useJobApplications(jobId: number | null) {
  return useQuery<Application[]>({
    queryKey: queryKeys.applications(jobId),
    queryFn: () => {
      if (!jobId) return [];
      return applicationsApi.getByJob(jobId);
    },
    enabled: jobId !== null && jobId !== undefined,
  });
}

export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => applicationsApi.apply(formData),
    onSuccess: () => {
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
    }: {
      id: number;
      stage: ApplicationStage;
      orderIndex?: number;
    }) => applicationsApi.updateStage(id, stage, orderIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useDeleteApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => applicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
