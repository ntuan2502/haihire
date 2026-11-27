"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Clock,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import type { WebsiteNotification } from "@haihire/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { formatDate, formatRelativeTime, formatTime } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/hooks/use-notification-queries";
import {
  NOTIFICATION_KIND_STYLES,
  formatNotificationContextLine,
  getNotificationHref,
} from "@/components/notifications/notification-utils";

type InboxFilter = "all" | "unread";

export function NotificationBell({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const { t, locale } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;
  const relOverrides = locOverrides
    ? {
        ...locOverrides,
        defaultLanguage: locale ?? locOverrides.defaultLanguage,
      }
    : undefined;
  const router = useRouter();
  const canViewApplications = useHasPermission("application:view");
  const canViewInterviews = useHasPermission("interview:view");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");

  const inbox = useNotificationsQuery(organizationId, userId);
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const items = inbox.data?.items ?? [];
  const unread = inbox.data?.unreadCount ?? 0;
  const visibleItems =
    filter === "unread" ? items.filter((item) => !item.readAt) : items;
  const isMarking = markRead.isPending || markAllRead.isPending;

  function resolveHref(item: WebsiteNotification): string | null {
    return getNotificationHref(item, {
      canViewApplications,
      canViewInterviews,
    });
  }

  function openNotification(item: WebsiteNotification) {
    const href = resolveHref(item);
    if (!item.readAt) markRead.mutate(item.id);
    if (!href) return;
    setOpen(false);
    router.push(href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={
          unread > 0
            ? `${t("settings.tabs.notifications")} (${unread > 99 ? "99+" : unread})`
            : t("settings.tabs.notifications")
        }
        className="relative flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        className="w-88 sm:w-96 max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-border bg-muted/30 px-3.5 py-2.5">
          <DropdownMenuLabel className="p-0 flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
            <span className="truncate">{t("settings.tabs.notifications")}</span>
            {unread > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </DropdownMenuLabel>

          <div className="flex items-center gap-1 shrink-0">
            {unread > 0 && (
              <button
                type="button"
                disabled={isMarking}
                onClick={() => markAllRead.mutate()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                <span>{t("notificationInbox.readAll")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/account#notifications");
              }}
              aria-label={t("notificationInbox.settings")}
              title={t("notificationInbox.settings")}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Settings className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        {!inbox.isLoading && !inbox.isError && items.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-border bg-background/60 px-3.5 py-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{t("notificationInbox.all")}</span>
              <span className="text-[11px] opacity-80 tabular-nums">
                {items.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                filter === "unread"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{t("notificationInbox.unread")}</span>
              {unread > 0 && (
                <span className="text-[11px] opacity-80 tabular-nums">
                  {unread}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="max-h-80 sm:max-h-96 overflow-y-auto">
          {inbox.isLoading && (
            <div className="divide-y divide-border/60" aria-busy="true">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex items-start gap-3 px-3.5 py-3">
                  <div className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {inbox.isError && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <BellOff className="size-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("notificationInbox.loadError")}
              </p>
            </div>
          )}

          {!inbox.isLoading && !inbox.isError && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-9 text-center">
              <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BellOff className="size-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("notificationInbox.empty")}
              </p>
              <p className="max-w-60 text-xs text-muted-foreground">
                {t("notificationInbox.emptyHint")}
              </p>
            </div>
          )}

          {!inbox.isLoading &&
            !inbox.isError &&
            items.length > 0 &&
            visibleItems.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-9 text-center">
                <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCheck className="size-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {t("notificationInbox.emptyUnread")}
                </p>
              </div>
            )}

          {!inbox.isLoading && !inbox.isError && visibleItems.length > 0 && (
            <DropdownMenuGroup className="divide-y divide-border/60">
              {visibleItems.map((item) => {
                const {
                  icon: KindIcon,
                  boxClass,
                  iconClass,
                } = NOTIFICATION_KIND_STYLES[item.kind];
                const contextLine = formatNotificationContextLine(item, t);
                const isUnread = !item.readAt;
                const isNavigable = resolveHref(item) !== null;

                return (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={(event) => {
                      if (!isNavigable) event.preventDefault();
                    }}
                    onClick={() => openNotification(item)}
                    className={cn(
                      "flex items-start gap-3 rounded-none px-3.5 py-3 transition-colors",
                      isNavigable
                        ? "cursor-pointer focus:bg-accent/70"
                        : "cursor-default focus:bg-transparent data-[highlighted]:bg-transparent",
                      isUnread &&
                        (isNavigable
                          ? "bg-primary/[0.04]"
                          : "bg-primary/[0.04] focus:bg-primary/[0.04] data-[highlighted]:bg-primary/[0.04]"),
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
                        boxClass,
                      )}
                    >
                      <KindIcon
                        className={cn("size-4", iconClass)}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs leading-snug truncate",
                            isUnread
                              ? "font-semibold text-foreground"
                              : "font-medium text-muted-foreground",
                          )}
                        >
                          {t(`notificationInbox.${item.kind}`)}
                        </span>
                        {isUnread && (
                          <span
                            className="size-2 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      {contextLine && (
                        <p className="text-xs text-foreground/85 line-clamp-2 leading-relaxed">
                          {contextLine}
                        </p>
                      )}

                      {item.scheduledAt && (
                        <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Calendar
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {formatDate(
                              item.scheduledAt,
                              "numeric",
                              locOverrides,
                            )}{" "}
                            {formatTime(item.scheduledAt, locOverrides)}
                            {item.round
                              ? ` · ${t("notificationInbox.roundBadge", {
                                  round: String(item.round),
                                })}`
                              : ""}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock
                          className="size-3 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <time
                          dateTime={item.createdAt}
                          title={`${formatDate(
                            item.createdAt,
                            "numeric",
                            locOverrides,
                          )} ${formatTime(item.createdAt, locOverrides)}`}
                        >
                          {formatRelativeTime(item.createdAt, relOverrides)}
                        </time>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          )}
        </div>

        {/* Footer */}
        {!inbox.isLoading && !inbox.isError && (
          <div className="border-t border-border bg-muted/20 p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <span>{t("notificationInbox.viewAll")}</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
