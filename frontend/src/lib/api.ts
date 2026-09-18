import axios from "axios";
import type {
  Application,
  Candidate,
  CreateJobInput,
  Job,
  Organization,
  User,
  InviteLink,
  UpdateCandidateInput,
  Interview,
  CreateInterviewInput,
  UpdateInterviewInput,
} from "../types";
import type { EmailSettings } from "./email-templates";

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // In browser, if an external non-localhost URL is explicitly provided, use it.
    // Otherwise, always use relative "/api" so requests proxy through Next.js rewrites.
    // This allows devices on LAN (phone, tablet, laptop) or localhost to work without CORS or Private Network Access blocks.
    const customUrl = process.env.NEXT_PUBLIC_API_URL;
    if (customUrl && !customUrl.includes("localhost") && !customUrl.includes("127.0.0.1")) {
      return customUrl;
    }
    return "/api";
  }
  // Server-side (SSR / Server Actions) can communicate directly with backend
  return (
    process.env.INTERNAL_API_URL ||
    (process.env.NEXT_PUBLIC_API_URL &&
      !process.env.NEXT_PUBLIC_API_URL.startsWith("/") &&
      process.env.NEXT_PUBLIC_API_URL) ||
    "http://127.0.0.1:3001"
  );
};

export const getDocumentUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("/ats-resumes/")) {
    const idx = url.indexOf("/ats-resumes/");
    return url.slice(idx);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiUrl = getApiBaseUrl();
  return `${apiUrl.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

export const jobsApi = {
  getAll: async (params?: {
    status?: string;
    department?: string;
    search?: string;
    organizationId?: string | null;
    organizationSlug?: string | null;
  }): Promise<Job[]> => {
    const response = await api.get<Job[]>("/jobs", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  getBySlug: async (orgSlug: string, jobSlug: string): Promise<Job> => {
    const response = await api.get<Job>(`/jobs/careers/${orgSlug}/${jobSlug}`);
    return response.data;
  },

  create: async (data: CreateJobInput): Promise<Job> => {
    const response = await api.post<Job>("/jobs", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateJobInput>): Promise<Job> => {
    const response = await api.patch<Job>(`/jobs/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};

export const applicationsApi = {
  getAll: async (filter?: { organizationId?: string }): Promise<Application[]> => {
    const params = new URLSearchParams();
    if (filter?.organizationId) params.append("organizationId", filter.organizationId);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get<Application[]>(`/applications${queryString}`);
    return response.data;
  },

  getByJob: async (jobId: string): Promise<Application[]> => {
    const response = await api.get<Application[]>(`/applications/job/${jobId}`);
    return response.data;
  },

  getById: async (id: string): Promise<Application> => {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  apply: async (formData: FormData): Promise<Application> => {
    const response = await api.post<Application>(
      "/applications/apply",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  updateStage: async (
    id: string,
    stage: string,
    orderIndex = 0,
  ): Promise<Application> => {
    const response = await api.patch<Application>(
      `/applications/${id}/stage`,
      { stage, orderIndex },
    );
    return response.data;
  },

  updateCandidate: async (
    id: string,
    data: {
      candidateName?: string;
      candidateEmail?: string;
      candidatePhone?: string;
      notes?: string;
      resumeUrl?: string;
      resumeFileName?: string;
    },
  ): Promise<Application> => {
    const response = await api.patch<Application>(`/applications/${id}`, data);
    return response.data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    type?: string,
  ): Promise<Application> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<Application>(
      `/applications/${id}/documents`,
      formData,
      {
        params: type ? { type } : undefined,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  deleteDocument: async (
    id: string,
    params?: { documentId?: string; url?: string },
  ): Promise<Application> => {
    const response = await api.delete<Application>(
      `/applications/${id}/documents`,
      { params },
    );
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },
};

export const candidatesApi = {
  getAll: async (organizationId?: string): Promise<Candidate[]> => {
    const response = await api.get<Candidate[]>("/candidates", {
      params: organizationId ? { organizationId } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Candidate> => {
    const response = await api.get<Candidate>(`/candidates/${id}`);
    return response.data;
  },

  create: async (formData: FormData): Promise<Candidate> => {
    const response = await api.post<Candidate>("/candidates", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  update: async (id: string, data: UpdateCandidateInput): Promise<Candidate> => {
    const response = await api.patch<Candidate>(`/candidates/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/candidates/${id}`);
    return response.data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    type?: string,
  ): Promise<Candidate> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<Candidate>(
      `/candidates/${id}/documents`,
      formData,
      {
        params: type ? { type } : undefined,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  deleteDocument: async (
    id: string,
    params?: { documentId?: string; url?: string },
  ): Promise<Candidate> => {
    const response = await api.delete<Candidate>(
      `/candidates/${id}/documents`,
      { params },
    );
    return response.data;
  },

  getDocumentDownloadUrl: (id: string, url: string, name: string): string => {
    const baseUrl = getApiBaseUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedName = encodeURIComponent(name);
    return `${baseUrl}/candidates/${id}/documents/download?url=${encodedUrl}&name=${encodedName}`;
  },
};

export const interviewsApi = {
  getAll: async (params?: {
    organizationId?: string;
    jobId?: string;
    applicationId?: string;
  }): Promise<Interview[]> => {
    const response = await api.get<Interview[]>("/interviews", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Interview> => {
    const response = await api.get<Interview>(`/interviews/${id}`);
    return response.data;
  },

  create: async (data: CreateInterviewInput): Promise<Interview> => {
    const response = await api.post<Interview>("/interviews", data);
    return response.data;
  },

  update: async (id: string, data: UpdateInterviewInput): Promise<Interview> => {
    const response = await api.patch<Interview>(`/interviews/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/interviews/${id}`);
    return response.data;
  },
};

export const organizationsApi = {
  getPublicOrg: async (slug: string): Promise<Organization> => {
    const response = await api.get<Organization>(`/organizations/public/${slug}`);
    return response.data;
  },

  getMyOrg: async (): Promise<Organization | null> => {
    const response = await api.get<Organization | null>("/organizations/my");
    return response.data;
  },

  getMyOrgs: async (): Promise<Organization[]> => {
    const response = await api.get<Organization[]>("/organizations/my/all");
    return response.data;
  },

  switchOrg: async (organizationId: string): Promise<{ success: boolean; organization: Organization; user: User }> => {
    const response = await api.post<{ success: boolean; organization: Organization; user: User }>("/organizations/switch", { organizationId });
    return response.data;
  },

  getMembers: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/organizations/my/members");
    return response.data;
  },

  updateMyOrg: async (data: {
    name?: string;
    slug?: string;
  }): Promise<Organization> => {
    const response = await api.patch<Organization>("/organizations/my", data);
    return response.data;
  },

  deleteMyOrg: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      "/organizations/my",
    );
    return response.data;
  },

  createInviteLink: async (data: {
    role?: string;
    expiresIn?: string;
    maxUses?: string;
  }): Promise<InviteLink> => {
    const response = await api.post<InviteLink>("/organizations/my/invite-links", data);
    return response.data;
  },

  getInviteLinks: async (): Promise<InviteLink[]> => {
    const response = await api.get<InviteLink[]>("/organizations/my/invite-links");
    return response.data;
  },

  revokeInviteLink: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/organizations/my/invite-links/${id}`,
    );
    return response.data;
  },

  getPublicInvite: async (
    token: string,
  ): Promise<{
    valid: boolean;
    token?: string;
    role?: string;
    organization?: { id: string; name: string; slug: string };
    createdByName?: string;
    expiresAt?: string | null;
    message?: string;
  }> => {
    const response = await api.get(`/organizations/invite-links/public/${token}`);
    return response.data;
  },

  joinByToken: async (
    token: string,
  ): Promise<{
    success: boolean;
    organization: Organization;
    role: string;
    message: string;
  }> => {
    const response = await api.post(`/organizations/invite-links/join/${token}`);
    return response.data;
  },

  updateMemberRole: async (
    memberId: string,
    role: "ADMIN" | "MEMBER",
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/organizations/my/members/${memberId}/role`,
      { role },
    );
    return response.data;
  },

  removeMember: async (
    memberId: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/organizations/my/members/${memberId}`,
    );
    return response.data;
  },
};

export const authApi = {
  getMe: async (): Promise<User> => {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },
};

export const emailApi = {
  getTemplates: async (organizationId?: string | null) => {
    const response = await api.get("/email/templates", {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  updateTemplate: async (
    type: string,
    data: { subject?: string; body?: string; enabled?: boolean },
    organizationId?: string | null,
  ) => {
    const response = await api.put(`/email/templates/${type}`, data, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  getSettings: async (organizationId?: string | null) => {
    const response = await api.get("/email/settings", {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  updateSettings: async (data: Partial<EmailSettings>, organizationId?: string | null) => {
    const response = await api.put("/email/settings", data, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  sendEmail: async (
    data: {
      to: string;
      recipientName: string;
      subject: string;
      body: string;
      templateType?: string;
      candidateId?: string;
      applicationId?: string;
      variables?: Record<string, string>;
    },
    organizationId?: string | null,
  ) => {
    const response = await api.post("/email/send", data, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  sendTestEmail: async (to: string, organizationId?: string | null) => {
    const response = await api.post("/email/test", { to }, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  getLogs: async (
    paramsOrOrgId?:
      | {
          organizationId?: string | null;
          candidateId?: string;
          page?: number;
          limit?: number;
          search?: string;
          status?: string;
        }
      | string
      | null,
    candidateId?: string,
  ) => {
    const params =
      typeof paramsOrOrgId === "object" && paramsOrOrgId !== null
        ? paramsOrOrgId
        : {
            organizationId: paramsOrOrgId || undefined,
            candidateId: candidateId || undefined,
          };

    const response = await api.get("/email/logs", {
      params: {
        organizationId: params.organizationId || undefined,
        candidateId: params.candidateId || undefined,
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status,
      },
    });
    return response.data;
  },

  getVariables: async () => {
    const response = await api.get("/email/variables");
    return response.data;
  },
};

export const activitiesApi = {
  getByCandidate: async (candidateId: string, organizationId?: string | null) => {
    const response = await api.get(`/activities/candidate/${candidateId}`, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  getByApplication: async (applicationId: string, organizationId?: string | null) => {
    const response = await api.get(`/activities/application/${applicationId}`, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post("/activities", data);
    return response.data;
  },
};

