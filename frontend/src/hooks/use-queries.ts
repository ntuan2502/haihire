"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi, applicationsApi, organizationsApi } from "@/lib/api";
import type { Job, Application, ApplicationStage, Organization, User, InviteLink } from "@/types";

// ==========================================
// QUERY KEYS
// ==========================================
export const queryKeys = {
  jobs: (orgId?: string | null) => ["jobs", { orgId }] as const,
  applications: (jobId?: string | null) => ["applications", { jobId }] as const,
  allApplications: () => ["applications", "all"] as const,
  myOrg: () => ["organization", "my"] as const,
  orgMembers: () => ["organization", "members"] as const,
  inviteLinks: () => ["organization", "invite-links"] as const,
};

// ==========================================
// JOBS HOOKS
// ==========================================
export function useJobs(organizationId?: string | null) {
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

// ==========================================
// APPLICATIONS HOOKS
// ==========================================
export function useAllApplications() {
  return useQuery<Application[]>({
    queryKey: queryKeys.allApplications(),
    queryFn: () => applicationsApi.getAll(),
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
      id: string;
      stage: ApplicationStage;
      orderIndex?: number;
    }) => applicationsApi.updateStage(id, stage, orderIndex),
    onSuccess: () => {
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
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file, type }: { id: string; file: File; type?: string }) =>
      applicationsApi.uploadDocument(id, file, type),
    onSuccess: () => {
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
  });
}

// ==========================================
// ORGANIZATION HOOKS
// ==========================================
export function useMyOrg() {
  return useQuery<Organization | null>({
    queryKey: queryKeys.myOrg(),
    queryFn: () => organizationsApi.getMyOrg(),
  });
}

export function useUpdateMyOrgMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; slug?: string }) =>
      organizationsApi.updateMyOrg(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
  });
}

export function useDeleteMyOrgMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => organizationsApi.deleteMyOrg(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrg() });
    },
  });
}

export function useOrgMembers() {
  return useQuery<User[]>({
    queryKey: queryKeys.orgMembers(),
    queryFn: () => organizationsApi.getMembers(),
  });
}

export function useInviteLinks() {
  return useQuery<InviteLink[]>({
    queryKey: queryKeys.inviteLinks(),
    queryFn: () => organizationsApi.getInviteLinks(),
  });
}

export function useCreateInviteLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { role?: string; expiresIn?: string; maxUses?: string }) =>
      organizationsApi.createInviteLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
  });
}

export function useRevokeInviteLinkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationsApi.revokeInviteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
    },
  });
}



