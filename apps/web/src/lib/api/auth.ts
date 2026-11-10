import { api } from "./client";
import type { User } from "@/types";

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
};
