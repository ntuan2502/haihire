import { z } from "zod";

export const notificationPreferencesSchema = z.strictObject({
  applicationWebsite: z.boolean(),
  interviewWebsite: z.boolean(),
  applicationEmail: z.boolean(),
  interviewEmail: z.boolean(),
});

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  applicationWebsite: true,
  interviewWebsite: true,
  applicationEmail: false,
  interviewEmail: false,
};

export const notificationKinds = [
  "applicationReceived",
  "interviewScheduled",
  "interviewChanged",
  "interviewCancelled",
] as const;

export type NotificationKind = (typeof notificationKinds)[number];

export const notificationStatusFilters = ["all", "unread", "read"] as const;

export type NotificationStatusFilter =
  (typeof notificationStatusFilters)[number];

export const notificationKindFilters = ["all", ...notificationKinds] as const;

export type NotificationKindFilter = (typeof notificationKindFilters)[number];

export const listNotificationsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(notificationStatusFilters).optional(),
  kind: z.enum(notificationKindFilters).optional(),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

export interface WebsiteNotification {
  id: string;
  kind: NotificationKind;
  resourceId: string;
  createdAt: string;
  readAt: string | null;
  candidateName?: string | null;
  jobTitle?: string | null;
  scheduledAt?: string | null;
  round?: number | null;
}

export interface WebsiteNotificationInbox {
  items: WebsiteNotification[];
  unreadCount: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}
