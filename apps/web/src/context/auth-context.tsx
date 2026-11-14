"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { QueryClientContext } from "@tanstack/react-query";
import { isAppEventType, type AppEvent } from "@haihire/shared";
import { toast } from "@/lib/toast";
import { api, getApiBaseUrl } from "@/lib/api/client";
import { queryKeys } from "@/hooks/query-keys";
import { createRealtimeInvalidator } from "@/lib/realtime-sync";
import { getOrgRoleLabel } from "@/lib/roles";
import { useOptionalI18n } from "@/i18n/optional";
import type { User, Organization } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<User>;
  logout: () => Promise<void> | void;
  updateUserOrg: (org: Organization, updatedRole?: string) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  refreshUser: () => Promise<User | null>;
  setSession: (accessToken: string, refreshToken?: string, user?: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isOwner: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "haihire_recruiter_token";
const REFRESH_TOKEN_KEY = "haihire_recruiter_refresh_token";
const USER_KEY = "haihire_recruiter_user";

function setHasOrgCookie(hasOrg: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `haihire_has_org=${hasOrg ? "true" : "false"}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function setAuthCookies(_token: string | null | undefined, hasOrg: boolean) {
  if (typeof document === "undefined") return;
  // Always sync org membership cookie; haihire_token is managed as an HttpOnly cookie by the backend
  setHasOrgCookie(hasOrg);
}

function clearAuthCookies() {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `haihire_has_org=; path=/; max-age=0; SameSite=Lax${secure}`;
}

function isSessionRequiredRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") || pathname.startsWith("/auth/onboarding")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  const queryClient = useContext(QueryClientContext) ?? null;
  const { t } = useOptionalI18n();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const tRef = useRef(t);

  useEffect(() => {
    routerRef.current = router;
    userRef.current = user;
    tRef.current = t;
  }, [router, user, t]);

  const setSession = useCallback(
    (newAccessToken: string, newRefreshToken?: string, newUserData?: User) => {
      setToken(newAccessToken);
      localStorage.setItem(TOKEN_KEY, newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      if (newUserData) {
        setUser(newUserData);
        localStorage.setItem(USER_KEY, JSON.stringify(newUserData));
        setAuthCookies(newAccessToken, Boolean(newUserData.organizationId));
      } else if (user) {
        setAuthCookies(newAccessToken, Boolean(user.organizationId));
      } else {
        setAuthCookies(newAccessToken, false);
      }
      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
    },
    [user],
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    queryClient?.clear();
    delete api.defaults.headers.common.Authorization;
    try {
      await api.post("/auth/logout");
    } catch {
      // Best-effort cleanup of HttpOnly session cookies
    }
    clearAuthCookies();
    routerRef.current.replace("/auth/login");
    routerRef.current.refresh?.();
  }, [queryClient]);

  // Synchronize user profile with backend in real-time
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const savedToken =
        typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      if (savedToken) {
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      }

      const response = await api.get<User>("/auth/me");
      const latestUser = response.data;

      setUser(latestUser);
      localStorage.setItem(USER_KEY, JSON.stringify(latestUser));
      setAuthCookies(savedToken, Boolean(latestUser.organizationId));

      // If member was removed from org and is currently in dashboard, kick out immediately!
      if (!latestUser.organizationId) {
        if (
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/dashboard")
        ) {
          routerRef.current.replace("/auth/onboarding");
        }
      }

      return latestUser;
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        const hadClientSession = Boolean(
          typeof document !== "undefined" &&
          (document.cookie.includes("haihire_has_org=") ||
            document.cookie.includes("haihire_token=") ||
            localStorage.getItem(TOKEN_KEY) ||
            localStorage.getItem(USER_KEY)),
        );
        const onSessionRoute =
          typeof window !== "undefined" &&
          isSessionRequiredRoute(window.location.pathname);

        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        queryClient?.clear();
        delete api.defaults.headers.common.Authorization;

        if (hadClientSession || onSessionRoute) {
          try {
            await api.post("/auth/logout");
          } catch {
            // Best-effort cleanup of HttpOnly session cookies
          }
        }
        clearAuthCookies();

        if (onSessionRoute) {
          routerRef.current.replace("/auth/login");
          routerRef.current.refresh?.();
        }
      }
      return null;
    }
  }, [queryClient]);

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    let hasOptimisticSession = false;
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        const parsedUser: User = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
        setAuthCookies(savedToken, Boolean(parsedUser.organizationId));
        hasOptimisticSession = true;
      }
    } catch (err) {
      console.error("Failed to parse stored auth user:", err);
    } finally {
      if (hasOptimisticSession) {
        setLoading(false);
      }
    }

    refreshUser().finally(() => {
      setLoading(false);
    });
  }, [refreshUser]);

  // SSE Real-Time Sync & Background Visibility Wake-Up
  const currentUserId = user?.id;
  useEffect(() => {
    if (!currentUserId || typeof EventSource === "undefined") return;

    const invalidator = queryClient
      ? createRealtimeInvalidator(queryClient)
      : null;
    const sseBaseUrl = getApiBaseUrl();
    const eventSource = new EventSource(`${sseBaseUrl}/events/sse`, {
      withCredentials: true,
    });

    eventSource.onmessage = (e) => {
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

        // Notify entire app of SSE events
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
          if (!data.targetUserId || data.targetUserId === currentUserId) {
            void refreshUser();
          }
        }
      } catch (err) {
        console.error("[SSE Auth] Failed to parse message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("[SSE Auth] Connection dropped or reconnecting...", err);
    };

    const handleFocus = () => {
      refreshUser();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      invalidator?.cancel();
      eventSource.close();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId, queryClient, refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken?: string;
      user: User;
    }>("/auth/login", {
      email,
      password,
    });

    const { accessToken, refreshToken, user: userData } = response.data;

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(accessToken, Boolean(userData.organizationId));

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return userData;
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<User> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken?: string;
      user: User;
    }>("/auth/register", {
      firstName,
      lastName,
      email,
      password,
    });

    const { accessToken, refreshToken, user: userData } = response.data;

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(accessToken, Boolean(userData.organizationId));

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return userData;
  };

  const updateUserOrg = (org: Organization, updatedRole?: string) => {
    if (!user) return;
    queryClient?.clear();
    const isOwner = Boolean(
      (org as { ownerId?: string })?.ownerId &&
      (org as { ownerId?: string }).ownerId === user.id,
    );
    const updated: User = {
      ...user,
      organizationId: org.id,
      organization: org,
      isOwner,
      role: isOwner
        ? "ADMIN"
        : (updatedRole as "ADMIN" | "MEMBER") || user.role,
    };
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setAuthCookies(token, true);
  };

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = { ...prev, ...updatedFields };
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const isOwner = Boolean(
    user?.isOwner ||
    (user?.organization?.ownerId && user.organization.ownerId === user.id),
  );
  const isAdmin = user?.role === "ADMIN";
  const isMember = user?.role === "MEMBER";
  const canEdit = isOwner || isAdmin || user?.role === "RECRUITER";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUserOrg,
        updateUser,
        refreshUser,
        setSession,
        isAuthenticated: !!user,
        isAdmin,
        isMember,
        isOwner,
        canEdit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // Graceful fallback when rendered outside AuthProvider (e.g. isolated component unit tests)
    return {
      user: null,
      token: null,
      loading: false,
      login: async () => {
        throw new Error("useAuth must be used within an AuthProvider");
      },
      register: async () => {
        throw new Error("useAuth must be used within an AuthProvider");
      },
      logout: async () => {},
      updateUserOrg: () => {},
      updateUser: () => {},
      refreshUser: async () => null,
      setSession: () => {},
      isAuthenticated: false,
      isAdmin: false,
      isMember: false,
      isOwner: false,
      canEdit: true,
    };
  }
  return context;
}
