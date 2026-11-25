import { api } from "./client";
import type {
  UpdateUserPreferencesPayload,
  UpdateUserProfilePayload,
  User,
} from "@/types";
import type { UserSecurityAction } from "@haihire/shared";

export interface UserSessionRecord {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export type UserSecurityLogCategory = "all" | "login" | "security";

export interface UserSecurityLogRecord {
  id: string;
  action: UserSecurityAction | string;
  status: "SUCCESS" | "WARNING" | string;
  ipAddress: string | null;
  userAgent: string | null;
  requestId?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserSecurityLogsResponse {
  data: UserSecurityLogRecord[];
  total: number;
  limit: number;
  offset: number;
}

export const authApi = {
  getMe: async (): Promise<User> => {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },

  logout: async (): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>("/auth/logout");
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    user?: User;
    message?: string;
  }> => {
    const response = await api.post<{
      success: boolean;
      accessToken?: string;
      refreshToken?: string;
      user?: User;
      message?: string;
    }>("/auth/change-password", data);
    return response.data;
  },

  refreshToken: async (
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken: string;
    }>("/auth/refresh", { refreshToken });
    return response.data;
  },

  getMyPermissions: async (): Promise<{ permissions: string[] }> => {
    const response = await api.get<{ permissions: string[] }>(
      "/auth/me/permissions",
    );
    return response.data;
  },

  updatePreferences: async (
    data: UpdateUserPreferencesPayload,
  ): Promise<User> => {
    const response = await api.patch<User>("/auth/me/preferences", data);
    return response.data;
  },

  updateProfile: async (data: UpdateUserProfilePayload): Promise<User> => {
    const response = await api.patch<User>("/auth/me/profile", data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<User>("/auth/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  updateAvatarSource: async (source: "NONE" | "GRAVATAR"): Promise<User> => {
    const response = await api.patch<User>("/auth/me/avatar", { source });
    return response.data;
  },

  getSessions: async (): Promise<UserSessionRecord[]> => {
    const response = await api.get<UserSessionRecord[]>("/auth/sessions");
    return response.data;
  },

  revokeSession: async (sessionId: string): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(
      `/auth/sessions/${encodeURIComponent(sessionId)}`,
    );
    return response.data;
  },

  revokeOtherSessions: async (): Promise<{
    success: boolean;
    revokedCount: number;
  }> => {
    const response = await api.post<{
      success: boolean;
      revokedCount: number;
    }>("/auth/sessions/revoke-others");
    return response.data;
  },

  getSecurityLogs: async (params?: {
    category?: UserSecurityLogCategory;
    limit?: number;
    offset?: number;
  }): Promise<UserSecurityLogsResponse> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "all") {
      query.set("category", params.category);
    }
    if (params?.limit !== undefined) {
      query.set("limit", String(params.limit));
    }
    if (params?.offset !== undefined) {
      query.set("offset", String(params.offset));
    }
    const qs = query.toString();
    const response = await api.get<UserSecurityLogsResponse>(
      `/auth/security-logs${qs ? `?${qs}` : ""}`,
    );
    return response.data;
  },
};
