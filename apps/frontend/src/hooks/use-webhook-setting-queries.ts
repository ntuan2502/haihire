import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  webhookSettingsApi,
  type CreateWebhookSettingInput,
  type UpdateWebhookSettingInput,
  type TestWebhookSettingInput,
} from "@/lib/api";
import { queryKeys } from "./query-keys";
import { useAuth } from "@/context/auth-context";

export function useWebhookSettingsQuery() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: queryKeys.webhookSettings(orgId),
    queryFn: () => webhookSettingsApi.getWebhookSettings(),
    enabled: Boolean(orgId),
    staleTime: 30 * 1000,
  });
}

export function useCreateWebhookSettingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWebhookSettingInput) =>
      webhookSettingsApi.createWebhookSetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
  });
}

export function useUpdateWebhookSettingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookSettingInput }) =>
      webhookSettingsApi.updateWebhookSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
  });
}

export function useDeleteWebhookSettingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webhookSettingsApi.deleteWebhookSetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
  });
}

export function useTestWebhookSettingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TestWebhookSettingInput) =>
      webhookSettingsApi.testWebhookSetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
  });
}
