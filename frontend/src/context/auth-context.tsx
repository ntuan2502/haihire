"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User, Organization } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUserOrg: (org: Organization, updatedRole?: string) => void;
  refreshUser: () => Promise<User | null>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isOwner: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "ats_recruiter_token";
const USER_KEY = "ats_recruiter_user";

function setAuthCookies(token: string, hasOrg: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `ats_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `ats_has_org=${hasOrg ? "true" : "false"}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "ats_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "ats_has_org=; path=/; max-age=0; SameSite=Lax";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearAuthCookies();
    delete api.defaults.headers.common.Authorization;
    router.replace("/login");
  }, [router]);

  // Synchronize user profile with backend in real-time
  const refreshUser = React.useCallback(async (): Promise<User | null> => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) return null;

      api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
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
          router.replace("/onboarding/create-org");
        }
      }

      return latestUser;
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        logout();
      }
      return null;
    }
  }, [logout, router]);

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        const parsedUser: User = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
        setAuthCookies(savedToken, Boolean(parsedUser.organizationId));
      }
    } catch (err) {
      console.error("Failed to load saved session", err);
    } finally {
      setLoading(false);
    }

    // Immediately verify with server on load
    refreshUser();
  }, [refreshUser]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    if (!token || !user?.id) return;

    const sseBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const eventSource = new EventSource(
      `${sseBaseUrl}/events/sse?token=${encodeURIComponent(token)}`,
    );

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (!payload || !payload.type) return;

        // Broadcast to application components
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ats:sse_event", { detail: payload }),
          );
        }

        if (payload.type === "MEMBER_REMOVED") {
          // If this user was removed from the organization, kick out immediately!
          if (payload.targetUserId === user.id) {
            const updatedUser: User = {
              ...user,
              organizationId: null,
              organization: null,
            };
            setUser(updatedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            setAuthCookies(token, false);

            if (
              typeof window !== "undefined" &&
              window.location.pathname.startsWith("/dashboard")
            ) {
              router.replace("/onboarding/create-org");
            }
          }
        } else if (payload.type === "MEMBER_ROLE_UPDATED") {
          // If this user's role was updated
          if (payload.targetUserId === user.id && payload.role) {
            const updatedUser: User = {
              ...user,
              role: payload.role,
            };
            setUser(updatedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE event", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE stream disconnected, auto-reconnecting...", err);
    };

    // Tab focus listener for background safety net (no spam polling)
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
  }, [token, user?.id, refreshUser, router]);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<{
      accessToken: string;
      user: User;
    }>("/auth/login", {
      email,
      password,
    });

    const { accessToken, user: userData } = response.data;

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, accessToken);
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
      user: User;
    }>("/auth/register", {
      name,
      email,
      password,
    });

    const { accessToken, user: userData } = response.data;

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(accessToken, Boolean(userData.organizationId));

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return userData;
  };

  const updateUserOrg = (org: Organization, updatedRole?: string) => {
    if (!user) return;
    const isOwner = Boolean(
      (org as { ownerId?: string })?.ownerId &&
        (org as { ownerId?: string }).ownerId === user.id,
    );
    const updated: User = {
      ...user,
      organizationId: org.id,
      organization: org,
      isOwner,
      role: isOwner ? "ADMIN" : ((updatedRole as "ADMIN" | "MEMBER") || user.role),
    };
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    if (token) {
      setAuthCookies(token, true);
    }
  };

  const isAdmin = user?.role === "ADMIN";
  const isMember = user?.role === "MEMBER";
  const isOwner = Boolean(
    user?.isOwner ||
      (user?.organization?.ownerId && user.organization.ownerId === user.id),
  );
  const canEdit = isAdmin || isOwner;

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
        refreshUser,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
