"use client";

import { Calendar, ChevronRight, Clock, Mail, MailOpen } from "lucide-react";
import { cn } from "cn";
import type { WebsiteNotification } from "@haihire/shared";
import { useI18n } from "@/i18n";
import {
  formatDate,
  formatRelativeTime,
  formatTime,
  type LocalizationOverrides,
} from "@/lib/utils";
import {
  NOTIFICATION_KIND_STYLES,
  formatNotificationContextLine,
} from "./notification-utils";

export interface NotificationRowProps {
  item: WebsiteNotification;
  href: string | null;
  locOverrides?: LocalizationOverrides;
  relOverrides?: LocalizationOverrides;
  isMutating?: boolean;
  onOpen: (item: WebsiteNotification) => void;
  onToggleRead: (item: WebsiteNotification) => void;
}

export function NotificationRow({
  item,
  href,
  locOverrides,
  relOverrides,
  isMutating = false,
  onOpen,
  onToggleRead,
}: NotificationRowProps) {
  const { t } = useI18n();
  const {
    icon: KindIcon,
    boxClass,
    iconClass,
  } = NOTIFICATION_KIND_STYLES[item.kind];
  const contextLine = formatNotificationContextLine(item, t);
  const isUnread = !item.readAt;
  const isNavigable = href !== null;
  const toggleLabel = isUnread
    ? t("notificationInbox.markAsRead")
    : t("notificationInbox.markAsUnread");

  const innerContent = (
    <>
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
          boxClass,
        )}
      >
        <KindIcon className={cn("size-4", iconClass)} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs sm:text-sm leading-snug truncate",
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
          <p className="text-xs sm:text-[13px] text-foreground/85 leading-relaxed">
            {contextLine}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {item.scheduledAt && (
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Calendar
                className="size-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="truncate">
                {formatDate(item.scheduledAt, "numeric", locOverrides)}{" "}
                {formatTime(item.scheduledAt, locOverrides)}
                {item.round
                  ? ` · ${t("notificationInbox.roundBadge", {
                      round: String(item.round),
                    })}`
                  : ""}
              </span>
            </div>
          )}

          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
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
      </div>

      {isNavigable && (
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <div
      className={cn(
        "flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3 transition-colors",
        isNavigable ? "hover:bg-muted/40" : "hover:bg-muted/20",
        isUnread && "bg-primary/[0.03]",
      )}
    >
      {isNavigable ? (
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="group flex min-w-0 flex-1 items-start gap-3 sm:gap-3.5 rounded-lg p-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {innerContent}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-3.5 rounded-lg p-1 text-left cursor-default">
          {innerContent}
        </div>
      )}

      <button
        type="button"
        disabled={isMutating}
        onClick={() => onToggleRead(item)}
        aria-label={toggleLabel}
        title={toggleLabel}
        className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUnread ? (
          <MailOpen className="size-4" aria-hidden="true" />
        ) : (
          <Mail className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
