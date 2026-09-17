"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi, applicationsApi, organizationsApi, candidatesApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { Job, Application, Candidate, ApplicationStage, Organization, User, InviteLink } from "@/types";

// ==========================================
// QUERY KEYS
// ==========================================
export const queryKeys = {
  jobs: (orgId?: string | null) => ["jobs", { orgId }] as const,
  applications: (jobId?: string | null) => ["applications", { jobId }] as const,
  allApplications: (orgId?: string | null) => ["applications", "all", { orgId }] as const,
  candidates: (orgId?: string | null) => ["candidates", { orgId }] as const,
  candidate: (id?: string | null) => ["candidates", id] as const,
  myOrg: () => ["organization", "my"] as const,
  myOrgs: () => ["organization", "my-all"] as const,
  orgMembers: () => ["organization", "members"] as const,
  inviteLinks: () => ["organization", "invite-links"] as const,
};

// ==========================================
// JOBS HOOKS
// ==========================================
export function useJobs(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Job[]>({
    queryKey: queryKeys.jobs(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) return [];
      return jobsApi.getAll({ organizationId: effectiveOrgId });
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
    queryFn: () => jobsApi.getAll({ status: "PUBLISHED" }),
  });
}

export function usePublicJobs(orgSlug: string | null) {
  return useQuery<Job[]>({
    queryKey: ["jobs", "public-list", orgSlug],
    queryFn: () => {
      if (!orgSlug) return [];
      return jobsApi.getAll({ organizationSlug: orgSlug, status: "PUBLISHED" });
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

// ==========================================
// APPLICATIONS HOOKS
// ==========================================
export function useAllApplications(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Application[]>({
    queryKey: queryKeys.allApplications(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) return [];
      return applicationsApi.getAll({ organizationId: effectiveOrgId });
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
// CANDIDATES HOOKS
// ==========================================
export function useCandidates(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Candidate[]>({
    queryKey: queryKeys.candidates(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) return [];
      return candidatesApi.getAll(effectiveOrgId);
    },
    enabled: Boolean(effectiveOrgId),
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

// ==========================================
// ORGANIZATION HOOKS
// ==========================================
export function useMyOrg() {
  return useQuery<Organization | null>({
    queryKey: queryKeys.myOrg(),
    queryFn: () => organizationsApi.getMyOrg(),
  });
}

export function useMyOrgs() {
  return useQuery<Organization[]>({
    queryKey: queryKeys.myOrgs(),
    queryFn: () => organizationsApi.getMyOrgs(),
  });
}

export function useSwitchOrgMutation() {
  const queryClient = useQueryClient();
  const { updateUserOrg } = useAuth();

  return useMutation({
    mutationFn: (organizationId: string) =>
      organizationsApi.switchOrg(organizationId),
    onSuccess: (data) => {
      updateUserOrg(data.organization, data.user?.role);
      queryClient.invalidateQueries();
    },
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSseEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail?.type === "MEMBER_REMOVED" ||
        customEvent.detail?.type === "MEMBER_ROLE_UPDATED"
      ) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ats:sse_event", handleSseEvent);
      return () => window.removeEventListener("ats:sse_event", handleSseEvent);
    }
  }, [queryClient]);

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

export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: "ADMIN" | "MEMBER";
    }) => organizationsApi.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
  });
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => organizationsApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers() });
    },
  });
}



