"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { authApi, type UserSecurityLogCategory } from "@/lib/api/auth";
import { queryKeys } from "./query-keys";

export function useUserSessionsQuery(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.userSessions(user?.id),
    queryFn: () => authApi.getSessions(),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
  });
}

export function useRevokeSessionMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.userSessions(user?.id),
        }),
        queryClient.invalidateQueries({
          queryKey: ["auth", "security-logs"],
        }),
      ]);
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.userSessions(user?.id),
        }),
        queryClient.invalidateQueries({
          queryKey: ["auth", "security-logs"],
        }),
      ]);
    },
  });
}

export function useUserSecurityLogsQuery(
  params?: {
    category?: UserSecurityLogCategory;
    limit?: number;
    offset?: number;
  },
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.userSecurityLogs(user?.id, params),
    queryFn: () => authApi.getSecurityLogs(params),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
  });
}
