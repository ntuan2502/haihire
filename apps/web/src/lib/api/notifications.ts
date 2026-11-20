import type {
  ListNotificationsQuery,
  WebsiteNotificationInbox,
} from "@haihire/shared";
import { api } from "./client";

export const notificationsApi = {
  list: async (
    params?: ListNotificationsQuery,
  ): Promise<WebsiteNotificationInbox> => {
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined),
        )
      : undefined;
    const response = await api.get<WebsiteNotificationInbox>(
      "/notifications",
      cleanParams && Object.keys(cleanParams).length > 0
        ? { params: cleanParams }
        : undefined,
    );
    return response.data;
  },

  markRead: async (id?: string): Promise<void> => {
    await api.patch(id ? `/notifications/${id}/read` : "/notifications/read");
  },

  markUnread: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/unread`);
  },
};
