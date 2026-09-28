"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { jobsApi, applicationsApi, organizationsApi, candidatesApi, interviewsApi, emailApi, activitiesApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { Job, Application, Candidate, ApplicationStage, Organization, User, InviteLink, Interview, CreateInterviewInput, UpdateInterviewInput, PaginatedResult } from "@/types";
import type { EmailTemplate, EmailSettings, EmailLog, ActivityEvent } from "@/lib/email-templates";

// ==========================================
// QUERY KEYS
// ==========================================
export const queryKeys = {
  jobs: (orgId?: string | null) => ["jobs", { orgId }] as const,
  applications: (jobId?: string | null) => ["applications", { jobId }] as const,
  application: (id?: string | null) => ["applications", "detail", id] as const,
  allApplications: (orgId?: string | null) => ["applications", "all", { orgId }] as const,
  paginatedApplications: (params?: Record<string, unknown>) => ["applications", "paginated", params] as const,
  candidates: (orgId?: string | null) => ["candidates", { orgId }] as const,
  candidate: (id?: string | null) => ["candidates", id] as const,
  interviews: (params?: Record<string, unknown>) => ["interviews", params] as const,
  interview: (id?: string | null) => ["interviews", "detail", id] as const,
  myOrg: () => ["organization", "my"] as const,
  myOrgs: () => ["organization", "my-all"] as const,
  orgMembers: () => ["organization", "members"] as const,
  inviteLinks: () => ["organization", "invite-links"] as const,
  emailTemplates: (orgId?: string | null) => ["email", "templates", { orgId }] as const,
  emailSettings: (orgId?: string | null) => ["email", "settings", { orgId }] as const,
  emailLogs: (params?: {
    orgId?: string | null;
    candidateId?: string | null;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => ["email", "logs", params] as const,
  candidateActivities: (
    candidateId?: string | null,
    orgId?: string | null,
    page?: number,
    limit?: number,
  ) => ["activities", "candidate", candidateId, { orgId, page, limit }] as const,
  applicationActivities: (
    applicationId?: string | null,
    orgId?: string | null,
    page?: number,
    limit?: number,
  ) => ["activities", "application", applicationId, { orgId, page, limit }] as const,
};

// ==========================================
// JOBS HOOKS
// ==========================================
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

// ==========================================
// APPLICATIONS HOOKS
// ==========================================
export function useApplications(params?: {
  organizationId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  jobId?: string;
  stage?: string;
}) {
  const { user } = useAuth();
  const effectiveOrgId =
    params?.organizationId !== undefined ? params.organizationId : user?.organizationId;

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
    enabled: Boolean(effectiveOrgId),
    placeholderData: keepPreviousData,
  });
}

export function useAllApplications(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<Application[]>({
    queryKey: queryKeys.allApplications(effectiveOrgId),
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const res = await applicationsApi.getAll({ organizationId: effectiveOrgId, limit: 1000 });
      return res.data;
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

// ==========================================
// INTERVIEWS HOOKS
// ==========================================
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
    params?.organizationId !== undefined ? params.organizationId : user?.organizationId;

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
  });
}

export function useUpdateInterviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInterviewInput }) =>
      interviewsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.interview(variables.id) });
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
    },
  });
}

// ==========================================
// EMAIL HOOKS
// ==========================================
export function useEmailTemplates(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<EmailTemplate[]>({
    queryKey: queryKeys.emailTemplates(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) return [];
      return emailApi.getTemplates(effectiveOrgId);
    },
    enabled: Boolean(effectiveOrgId),
  });
}

export function useUpdateEmailTemplateMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      type,
      data,
    }: {
      type: string;
      data: { subject?: string; body?: string; enabled?: boolean };
    }) => emailApi.updateTemplate(type, data, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
    },
  });
}

export function useEmailSettings(organizationId?: string | null) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<EmailSettings>({
    queryKey: queryKeys.emailSettings(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) throw new Error("No organization ID");
      return emailApi.getSettings(effectiveOrgId);
    },
    enabled: Boolean(effectiveOrgId),
  });
}

export function useUpdateEmailSettingsMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: Partial<EmailSettings>) =>
      emailApi.updateSettings(data, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "settings"] });
    },
  });
}

export function useSendTestEmailMutation() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (to: string) => emailApi.sendTestEmail(to, user?.organizationId),
  });
}

export interface PaginatedLogsResult {
  data: EmailLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useEmailLogs(params?: {
  organizationId?: string | null;
  candidateId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const { user } = useAuth();
  const effectiveOrgId =
    params?.organizationId !== undefined ? params.organizationId : user?.organizationId;

  return useQuery<PaginatedLogsResult>({
    queryKey: queryKeys.emailLogs({
      orgId: effectiveOrgId,
      candidateId: params?.candidateId,
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      status: params?.status,
    }),
    queryFn: async () => {
      if (!effectiveOrgId) {
        return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      return emailApi.getLogs({
        organizationId: effectiveOrgId,
        candidateId: params?.candidateId || undefined,
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        status: params?.status,
      });
    },
    enabled: Boolean(effectiveOrgId),
  });
}

export function useSendEmailMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      to: string;
      recipientName: string;
      subject: string;
      body: string;
      templateType?: string;
      candidateId?: string;
      applicationId?: string;
      variables?: Record<string, string>;
    }) => emailApi.sendEmail(data, user?.organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email", "logs"] });
      if (variables?.candidateId) {
        queryClient.invalidateQueries({
          queryKey: ["activities", "candidate", variables.candidateId],
        });
      }
    },
  });
}

// ==========================================
// CANDIDATE & APPLICATION ACTIVITIES HOOKS
// ==========================================
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




