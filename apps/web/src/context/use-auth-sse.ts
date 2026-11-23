"use client";

import { useEffect, type MutableRefObject } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { isAppEventType, type AppEvent } from "@haihire/shared";
import { toast } from "@/lib/toast";
import { getApiBaseUrl, refreshAuthSession } from "@/lib/api/client";
import { queryKeys } from "@/hooks/query-keys";
import { createRealtimeInvalidator } from "@/lib/realtime-sync";
import { getOrgRoleLabel } from "@/lib/roles";
import type { I18nContextType } from "@/i18n/context";
import type { User } from "@/types";

const PROACTIVE_SSE_REFRESH_MS = 13 * 60 * 1000;
const ERROR_REFRESH_DEBOUNCE_MS = 2000;

interface UseAuthSseOptions {
  currentUserId?: string;
  queryClient: QueryClient | null;
  refreshUser: () => Promise<User | null>;
  userRef: MutableRefObject<User | null>;
  tRef: MutableRefObject<I18nContextType["t"]>;
}

export function useAuthSse({
  currentUserId,
  queryClient,
  refreshUser,
  userRef,
  tRef,
}: UseAuthSseOptions) {
  useEffect(() => {
    if (!currentUserId || typeof EventSource === "undefined") return;

    let disposed = false;
    let eventSource: EventSource | null = null;
    let errorRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidator = queryClient
      ? createRealtimeInvalidator(queryClient)
      : null;
    const sseBaseUrl = getApiBaseUrl();

    const handleMessage = (e: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(e.data);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("type" in parsed) ||
          typeof parsed.type !== "string"
        ) {
          return;
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ats:sse_event", { detail: parsed }),
          );
        }

        if (!isAppEventType(parsed.type)) {
          return;
        }

        const data = parsed as AppEvent;
        invalidator?.scheduleForEvent(data.type);

        const activeUser = userRef.current;

        if (data.type === "MEMBER_ROLE_UPDATED") {
          if (data.targetUserId === currentUserId) {
            const previousRole = activeUser?.role;
            const nextRole = data.role;
            if (nextRole && nextRole !== previousRole) {
              toast.warning(
                tRef.current("auth.sseRoleChanged", {
                  role: getOrgRoleLabel(nextRole, tRef.current),
                }),
                { toastId: `sse-role-changed-${nextRole}` },
              );
            }
            void refreshUser().finally(() => {
              if (!queryClient) return;
              void queryClient.invalidateQueries({
                queryKey: queryKeys.myPermissions(),
              });
              void queryClient.invalidateQueries({
                queryKey: queryKeys.rolePermissionsMatrix(),
              });
              void queryClient.invalidateQueries({
                queryKey: queryKeys.myOrg(),
              });
              void queryClient.invalidateQueries({
                queryKey: queryKeys.myOrgs(),
              });
            });
          }
        } else if (data.type === "MEMBER_REMOVED") {
          if (data.targetUserId === currentUserId) {
            toast.warning(tRef.current("auth.sseOrgRemoved"), {
              toastId: "sse-org-removed",
            });
            void refreshUser().finally(() => {
              if (!queryClient) return;
              void queryClient.invalidateQueries({
                queryKey: queryKeys.myOrg(),
              });
              void queryClient.invalidateQueries({
                queryKey: queryKeys.myOrgs(),
              });
              void queryClient.invalidateQueries({
                queryKey: queryKeys.myPermissions(),
              });
              void queryClient.invalidateQueries({
                queryKey: queryKeys.rolePermissionsMatrix(),
              });
            });
          }
        } else if (data.type === "PERMISSIONS_CHANGED") {
          if (
            activeUser &&
            !activeUser.isOwner &&
            activeUser.role !== "ADMIN" &&
            (!data.role || data.role === activeUser.role || data.role === "ALL")
          ) {
            toast.info(tRef.current("auth.ssePermissionsChanged"), {
              toastId: "sse-permissions-changed",
            });
          }
        } else if (data.type === "ORG_UPDATED") {
          const isSameOrgAlreadyActive = Boolean(
            data.targetUserId === currentUserId &&
            data.organizationId &&
            activeUser?.organizationId === data.organizationId,
          );
          const isOtherOrgMetadataUpdate = Boolean(
            !data.targetUserId &&
            data.organizationId &&
            activeUser?.organizationId &&
            data.organizationId !== activeUser.organizationId,
          );
          if (
            (!data.targetUserId || data.targetUserId === currentUserId) &&
            !isSameOrgAlreadyActive &&
            !isOtherOrgMetadataUpdate
          ) {
            void refreshUser();
          }
        } else if (data.type === "USER_PREFERENCES_CHANGED") {
          if (data.targetUserId === currentUserId) {
            void refreshUser();
          }
        }
      } catch (err) {
        console.error("[SSE Auth] Failed to parse message:", err);
      }
    };

    const connect = () => {
      if (disposed) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      const source = new EventSource(`${sseBaseUrl}/events/sse`, {
        withCredentials: true,
      });
      source.onopen = () => {
        if (errorRefreshTimer) {
          clearTimeout(errorRefreshTimer);
          errorRefreshTimer = null;
        }
      };
      source.onmessage = handleMessage;
      source.onerror = (err) => {
        console.warn("[SSE Auth] Connection dropped or reconnecting...", err);
        if (disposed || errorRefreshTimer) return;
        errorRefreshTimer = setTimeout(() => {
          errorRefreshTimer = null;
          if (!disposed) {
            void refreshAuthSession().catch(() => {});
          }
        }, ERROR_REFRESH_DEBOUNCE_MS);
      };
      eventSource = source;
    };

    connect();

    const handleAuthRefreshed = () => {
      if (!disposed) {
        connect();
      }
    };

    const handleAuthExpired = () => {
      disposed = true;
      if (errorRefreshTimer) {
        clearTimeout(errorRefreshTimer);
        errorRefreshTimer = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    let lastWakeupRefreshAt = 0;
    const throttledWakeupRefresh = () => {
      const now = Date.now();
      if (now - lastWakeupRefreshAt < 5000) return;
      lastWakeupRefreshAt = now;
      refreshUser();
    };

    const handleFocus = () => {
      throttledWakeupRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        throttledWakeupRefresh();
      }
    };

    const proactiveRefreshInterval = setInterval(() => {
      if (!disposed) {
        void refreshAuthSession().catch(() => {});
      }
    }, PROACTIVE_SSE_REFRESH_MS);

    window.addEventListener("haihire:auth-refreshed", handleAuthRefreshed);
    window.addEventListener("haihire:auth-expired", handleAuthExpired);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      invalidator?.cancel();
      if (errorRefreshTimer) {
        clearTimeout(errorRefreshTimer);
      }
      clearInterval(proactiveRefreshInterval);
      eventSource?.close();
      window.removeEventListener("haihire:auth-refreshed", handleAuthRefreshed);
      window.removeEventListener("haihire:auth-expired", handleAuthExpired);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId, queryClient, refreshUser, userRef, tRef]);
}
