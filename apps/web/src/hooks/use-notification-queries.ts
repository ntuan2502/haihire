"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ListNotificationsQuery,
  WebsiteNotificationInbox,
} from "@haihire/shared";
import { notificationsApi } from "@/lib/api/notifications";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { keepPreviousDataForSameOrg, queryKeys } from "./query-keys";

export function useNotificationsQuery(
  organizationId?: string | null,
  userId?: string | null,
  params?: ListNotificationsQuery,
  options?: { enabled?: boolean },
) {
  const isEnabled =
    Boolean(organizationId) && Boolean(userId) && (options?.enabled ?? true);

  return useQuery<WebsiteNotificationInbox>({
    queryKey: queryKeys.notifications(
      organizationId,
      userId,
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => notificationsApi.list(params),
    enabled: isEnabled,
    placeholderData: params
      ? keepPreviousDataForSameOrg<WebsiteNotificationInbox>(organizationId)
      : undefined,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: (id?: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error(t("notificationInbox.readError"));
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: () => notificationsApi.markRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error(t("notificationInbox.readError"));
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkNotificationUnreadMutation() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markUnread(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error(t("notificationInbox.unreadError"));
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
