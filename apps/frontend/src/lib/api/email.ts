import { api } from "./client";
import type { EmailSettings, EmailLog } from "../email-templates";

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

  getLogs: async (params?: {
    organizationId?: string | null;
    candidateId?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => {
    const response = await api.get<{
      data: EmailLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/email/logs", {
      params: {
        organizationId: params?.organizationId || undefined,
        candidateId: params?.candidateId || undefined,
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        status: params?.status,
      },
    });
    return response.data;
  },

  getVariables: async () => {
    const response = await api.get<
      Array<{ key: string; label: string; category: string; exampleValue: string }>
    >("/email/variables");
    return response.data;
  },
};
