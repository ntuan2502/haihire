"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type {
  EmailTemplate,
  EmailFlowConfig,
  EmailTemplateType,
  EmailSettings,
  EmailLog,
} from "@/lib/email-templates";
import { queryKeys } from "./query-keys";

export function useEmailTemplates(
  organizationId?: string | null,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<EmailTemplate[]>({
    queryKey: queryKeys.emailTemplates(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) return [];
      return emailApi.getTemplates(effectiveOrgId);
    },
    enabled: Boolean(effectiveOrgId) && (options?.enabled ?? true),
  });
}

export function useCreateEmailTemplateMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      name: string;
      type?: EmailTemplateType;
      subject: string;
      body: string;
      enabled?: boolean;
    }) => emailApi.createTemplate(data, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
    },
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
      data: {
        name?: string;
        type?: EmailTemplateType;
        subject?: string;
        body?: string;
        enabled?: boolean;
      };
    }) => emailApi.updateTemplate(type, data, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
    },
  });
}

export function useDuplicateEmailTemplateMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      emailApi.duplicateTemplate(id, { name }, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
    },
  });
}

export function useDeleteEmailTemplateMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      emailApi.deleteTemplate(id, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
    },
  });
}

export function useEmailFlows(
  organizationId?: string | null,
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  const effectiveOrgId =
    organizationId !== undefined ? organizationId : user?.organizationId;

  return useQuery<EmailFlowConfig[]>({
    queryKey: queryKeys.emailFlows(effectiveOrgId),
    queryFn: () => {
      if (!effectiveOrgId) return [];
      return emailApi.getFlows(effectiveOrgId);
    },
    enabled: Boolean(effectiveOrgId) && (options?.enabled ?? true),
  });
}

export function useUpdateEmailFlowMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      flowKey,
      data,
    }: {
      flowKey: string;
      data: { templateId?: string | null; enabled?: boolean };
    }) => emailApi.updateFlow(flowKey, data, user?.organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "flows"] });
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
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["email", "settings"] });
    },
  });
}

export function useSendTestEmailMutation() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (to: string) =>
      emailApi.sendTestEmail(to, user?.organizationId),
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
    params?.organizationId !== undefined
      ? params.organizationId
      : user?.organizationId;

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
      templateId?: string;
      templateName?: string;
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
    onError: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email", "logs"] });
      if (variables?.candidateId) {
        queryClient.invalidateQueries({
          queryKey: ["activities", "candidate", variables.candidateId],
        });
      }
    },
  });
}
