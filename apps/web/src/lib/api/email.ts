import { api } from "./client";
import type {
  EmailSettings,
  EmailTemplate,
  EmailFlowConfig,
  EmailTemplateType,
  EmailLog,
} from "../email-templates";

export const emailApi = {
  getTemplates: async (
    organizationId?: string | null,
  ): Promise<EmailTemplate[]> => {
    const response = await api.get<EmailTemplate[]>("/email/templates", {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  createTemplate: async (
    data: {
      name: string;
      type?: EmailTemplateType;
      subject: string;
      body: string;
      enabled?: boolean;
    },
    organizationId?: string | null,
  ): Promise<EmailTemplate> => {
    const response = await api.post<EmailTemplate>("/email/templates", data, {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  updateTemplate: async (
    idOrType: string,
    data: {
      name?: string;
      type?: EmailTemplateType;
      subject?: string;
      body?: string;
      enabled?: boolean;
    },
    organizationId?: string | null,
  ): Promise<EmailTemplate> => {
    const response = await api.put<EmailTemplate>(
      `/email/templates/${idOrType}`,
      data,
      {
        params: { organizationId: organizationId || undefined },
      },
    );
    return response.data;
  },

  duplicateTemplate: async (
    id: string,
    data: { name?: string } = {},
    organizationId?: string | null,
  ): Promise<EmailTemplate> => {
    const response = await api.post<EmailTemplate>(
      `/email/templates/${id}/duplicate`,
      data,
      {
        params: { organizationId: organizationId || undefined },
      },
    );
    return response.data;
  },

  deleteTemplate: async (
    id: string,
    organizationId?: string | null,
  ): Promise<{ deleted: boolean; id: string }> => {
    const response = await api.delete<{ deleted: boolean; id: string }>(
      `/email/templates/${id}`,
      {
        params: { organizationId: organizationId || undefined },
      },
    );
    return response.data;
  },

  getFlows: async (
    organizationId?: string | null,
  ): Promise<EmailFlowConfig[]> => {
    const response = await api.get<EmailFlowConfig[]>("/email/flows", {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  updateFlow: async (
    flowKey: string,
    data: { templateId?: string | null; enabled?: boolean },
    organizationId?: string | null,
  ): Promise<EmailFlowConfig> => {
    const response = await api.put<EmailFlowConfig>(
      `/email/flows/${flowKey}`,
      data,
      {
        params: { organizationId: organizationId || undefined },
      },
    );
    return response.data;
  },

  getSettings: async (organizationId?: string | null) => {
    const response = await api.get("/email/settings", {
      params: { organizationId: organizationId || undefined },
    });
    return response.data;
  },

  updateSettings: async (
    data: Partial<EmailSettings>,
    organizationId?: string | null,
  ) => {
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
      templateId?: string;
      templateName?: string;
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
    const response = await api.post(
      "/email/test",
      { to },
      {
        params: { organizationId: organizationId || undefined },
      },
    );
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
      Array<{
        key: string;
        label: string;
        category: string;
        exampleValue: string;
      }>
    >("/email/variables");
    return response.data;
  },
};
