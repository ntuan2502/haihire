"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  WebsiteNotification,
  WebsiteNotificationInbox,
} from "@haihire/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api/client";
import { formatDate, formatTime } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useHasPermission } from "@/hooks/use-has-permission";

export function NotificationBell({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const cache = useQueryClient();
  const canViewApplications = useHasPermission("application:view");
  const canViewInterviews = useHasPermission("interview:view");
  const queryKey = ["notifications", organizationId, userId] as const;
  const inbox = useQuery({
    queryKey,
    queryFn: async () =>
      (await api.get<WebsiteNotificationInbox>("/notifications")).data,
  });
  const markRead = useMutation({
    mutationFn: (id?: string) =>
      api.patch(id ? `/notifications/${id}/read` : "/notifications/read"),
    onSuccess: () => cache.invalidateQueries({ queryKey }),
    onError: () => toast.error(t("notificationInbox.readError")),
  });
  const unread = inbox.data?.unreadCount ?? 0;

  function openNotification(item: WebsiteNotification) {
    if (!item.readAt) markRead.mutate(item.id);
    if (item.kind === "applicationReceived" && canViewApplications) {
      router.push(
        `/dashboard/applications/${encodeURIComponent(item.resourceId)}`,
      );
    } else if (item.kind !== "applicationReceived" && canViewInterviews) {
      router.push(
        item.kind === "interviewCancelled"
          ? "/dashboard/interviews"
          : `/dashboard/interviews?interviewId=${encodeURIComponent(item.resourceId)}`,
      );
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("settings.tabs.notifications")}
        className="relative flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-accent"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuLabel>
          {t("settings.tabs.notifications")}
        </DropdownMenuLabel>
        {unread > 0 && (
          <DropdownMenuItem
            disabled={markRead.isPending}
            onClick={() => markRead.mutate(undefined)}
          >
            {t("notificationInbox.readAll")}
          </DropdownMenuItem>
        )}
        {inbox.isError && (
          <DropdownMenuLabel>
            {t("notificationInbox.loadError")}
          </DropdownMenuLabel>
        )}
        {inbox.data?.items.length === 0 && (
          <DropdownMenuLabel>{t("notificationInbox.empty")}</DropdownMenuLabel>
        )}
        {inbox.data?.items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="flex-col items-start"
            onClick={() => openNotification(item)}
          >
            <span
              className={
                item.readAt ? "text-muted-foreground" : "font-semibold"
              }
            >
              {t(`notificationInbox.${item.kind}`)}
            </span>
            <time
              dateTime={item.createdAt}
              className="text-xs text-muted-foreground"
            >
              {formatDate(item.createdAt)} {formatTime(item.createdAt)}
            </time>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
