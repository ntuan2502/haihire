import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  extractDateTimeInTimezone,
  type NotificationKind,
  type WebsiteNotification,
} from "@haihire/shared";
import { addDaysToYmd } from "@/lib/utils";

export const NOTIFICATION_KIND_STYLES: Record<
  NotificationKind,
  { icon: LucideIcon; boxClass: string; iconClass: string }
> = {
  applicationReceived: {
    icon: UserPlus,
    boxClass: "bg-primary/10 border-primary/20",
    iconClass: "text-primary",
  },
  interviewScheduled: {
    icon: CalendarCheck,
    boxClass: "bg-emerald-500/10 border-emerald-500/20",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  interviewChanged: {
    icon: CalendarClock,
    boxClass: "bg-amber-500/10 border-amber-500/20",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  interviewCancelled: {
    icon: CalendarX,
    boxClass: "bg-destructive/10 border-destructive/20",
    iconClass: "text-destructive",
  },
};

export function getNotificationHref(
  item: WebsiteNotification,
  permissions: {
    canViewApplications: boolean;
    canViewInterviews: boolean;
  },
): string | null {
  if (item.kind === "applicationReceived") {
    return permissions.canViewApplications
      ? `/applications/${encodeURIComponent(item.resourceId)}`
      : null;
  }
  if (item.kind === "interviewCancelled") {
    return null;
  }
  return permissions.canViewInterviews
    ? `/interviews?interviewId=${encodeURIComponent(item.resourceId)}`
    : null;
}

export function formatNotificationContextLine(
  item: WebsiteNotification,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  if (
    item.kind === "applicationReceived" &&
    item.candidateName &&
    item.jobTitle
  ) {
    return t("notificationInbox.appliedForJob", {
      candidate: item.candidateName,
      job: item.jobTitle,
    });
  }
  const parts = [item.candidateName, item.jobTitle].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  return parts.length > 0 ? parts.join(" • ") : null;
}

export type NotificationDateGroupKey = "today" | "yesterday" | "earlier";

export interface NotificationDateGroup {
  key: NotificationDateGroupKey;
  items: WebsiteNotification[];
}

export function groupNotificationsByDate(
  items: WebsiteNotification[],
  timezone?: string | null,
  now: Date = new Date(),
): NotificationDateGroup[] {
  if (items.length === 0) return [];

  const todayYmd = extractDateTimeInTimezone(now.toISOString(), timezone).date;
  const yesterdayYmd = addDaysToYmd(todayYmd, -1);

  const buckets: Record<NotificationDateGroupKey, WebsiteNotification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const item of items) {
    const itemYmd = extractDateTimeInTimezone(item.createdAt, timezone).date;
    if (todayYmd && itemYmd === todayYmd) {
      buckets.today.push(item);
    } else if (yesterdayYmd && itemYmd === yesterdayYmd) {
      buckets.yesterday.push(item);
    } else {
      buckets.earlier.push(item);
    }
  }

  const orderedKeys: readonly NotificationDateGroupKey[] = [
    "today",
    "yesterday",
    "earlier",
  ];
  return orderedKeys
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, items: buckets[key] }));
}
