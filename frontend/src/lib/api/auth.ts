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
};
