"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, getApiBaseUrl } from "@/lib/api/client";
import type { User, Organization } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
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

function setAuthCookies(token: string | null | undefined, hasOrg: boolean) {
  if (typeof document === "undefined") return;
  // Always sync org membership cookie even when access token lives solely in HttpOnly cookie
  setHasOrgCookie(hasOrg);
  if (!token || token === "null" || token === "undefined") {
    return;
  }
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `haihire_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function clearAuthCookies() {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `haihire_token=; path=/; max-age=0; SameSite=Lax${secure}`;
  document.cookie = `haihire_has_org=; path=/; max-age=0; SameSite=Lax${secure}`;
}

function isSessionRequiredRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") || pathname.startsWith("/auth/onboarding")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    queryClient = useQueryClient();
  } catch {
    queryClient = null;
  }
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    router.replace("/auth/login");
    router.refresh?.();
  }, [queryClient, router]);

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
          router.replace("/auth/onboarding");
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
          router.replace("/auth/login");
          router.refresh?.();
        }
      }
      return null;
    }
  }, [queryClient, router]);

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

    const sseBaseUrl = getApiBaseUrl();
    const eventSource = new EventSource(`${sseBaseUrl}/events/sse`, {
      withCredentials: true,
    });

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // Notify entire app of SSE events
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ats:sse_event", { detail: data }),
          );
        }

        if (data.type === "ORGANIZATION_REMOVED") {
          if (data.userId === currentUserId) {
            refreshUser().then((updatedUser) => {
              if (!updatedUser) return;
              setUser(updatedUser);
              localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
              setAuthCookies(token, false);

              if (
                typeof window !== "undefined" &&
                window.location.pathname.startsWith("/dashboard")
              ) {
                router.replace("/auth/onboarding");
              }
            });
          }
        } else if (data.type === "ORGANIZATION_SWITCHED") {
          if (data.userId === currentUserId) {
            refreshUser().then((updatedUser) => {
              if (updatedUser) {
                setUser(updatedUser);
                localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
                setAuthCookies(token, Boolean(updatedUser.organizationId));
              }
            });
          }
        } else if (data.type === "ROLE_CHANGED") {
          if (data.userId === currentUserId) {
            refreshUser().then((updatedUser) => {
              if (updatedUser) {
                setUser(updatedUser);
                localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
              }
            });
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
      eventSource.close();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, currentUserId, refreshUser, router]);

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
    name: string,
    email: string,
    password: string,
  ): Promise<User> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken?: string;
      user: User;
    }>("/auth/register", {
      name,
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
