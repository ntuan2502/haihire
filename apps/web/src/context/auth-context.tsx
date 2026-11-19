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
import { api } from "@/lib/api/client";
import { queryKeys } from "@/hooks/query-keys";
import { isWorkspaceRoute } from "@/lib/workspace-routes";
import { useOptionalI18n } from "@/i18n/optional";
import { useAuthSse } from "./use-auth-sse";
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
  return isWorkspaceRoute(pathname) || pathname.startsWith("/auth/onboarding");
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
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    routerRef.current = router;
    userRef.current = user;
    tRef.current = t;
  }, [router, user, t]);

  const setSession = useCallback(
    (newAccessToken: string, _newRefreshToken?: string, newUserData?: User) => {
      sessionEpochRef.current += 1;
      setToken(newAccessToken);
      if (newUserData) {
        userRef.current = newUserData;
        setUser(newUserData);
        localStorage.setItem(USER_KEY, JSON.stringify(newUserData));
        setAuthCookies(newAccessToken, Boolean(newUserData.organizationId));
      } else if (user) {
        setAuthCookies(newAccessToken, Boolean(user.organizationId));
      } else {
        setAuthCookies(newAccessToken, false);
      }
    },
    [user],
  );

  const logout = useCallback(async () => {
    sessionEpochRef.current += 1;
    userRef.current = null;
    setToken(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
    queryClient?.clear();
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
    const requestEpoch = sessionEpochRef.current;
    try {
      const response = await api.get<User>("/auth/me");
      if (requestEpoch !== sessionEpochRef.current) {
        return userRef.current;
      }
      const latestUser = response.data;

      userRef.current = latestUser;
      setUser(latestUser);
      localStorage.setItem(USER_KEY, JSON.stringify(latestUser));
      setAuthCookies(null, Boolean(latestUser.organizationId));

      // If member was removed from org and is currently in workspace, kick out immediately!
      if (!latestUser.organizationId) {
        if (
          typeof window !== "undefined" &&
          isWorkspaceRoute(window.location.pathname)
        ) {
          routerRef.current.replace("/auth/onboarding");
        }
      }

      return latestUser;
    } catch (err: unknown) {
      if (requestEpoch !== sessionEpochRef.current) {
        return userRef.current;
      }
      const axiosError = err as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        const hadClientSession = Boolean(
          typeof document !== "undefined" &&
          (document.cookie.includes("haihire_has_org=") ||
            document.cookie.includes("haihire_token=") ||
            localStorage.getItem(USER_KEY)),
        );
        const onSessionRoute =
          typeof window !== "undefined" &&
          isSessionRequiredRoute(window.location.pathname);

        sessionEpochRef.current += 1;
        userRef.current = null;
        setToken(null);
        setUser(null);
        localStorage.removeItem(USER_KEY);
        queryClient?.clear();

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
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedUser) {
        const parsedUser: User = JSON.parse(savedUser);
        userRef.current = parsedUser;
        setUser(parsedUser);
        setAuthCookies(null, Boolean(parsedUser.organizationId));
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

  // SSE Real-Time Sync, 15m JWT Reconnect & Background Visibility Wake-Up
  const currentUserId = user?.id;
  useAuthSse({
    currentUserId,
    queryClient,
    refreshUser,
    userRef,
    tRef,
  });

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken?: string;
      user: User;
    }>("/auth/login", {
      email,
      password,
    });

    const { accessToken, user: userData } = response.data;

    sessionEpochRef.current += 1;
    userRef.current = userData;
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(accessToken, Boolean(userData.organizationId));

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

    const { accessToken, user: userData } = response.data;

    sessionEpochRef.current += 1;
    userRef.current = userData;
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(accessToken, Boolean(userData.organizationId));

    return userData;
  };

  const updateUserOrg = useCallback(
    (org: Organization, updatedRole?: string) => {
      const currentUser = userRef.current ?? user;
      if (!currentUser) return;
      sessionEpochRef.current += 1;
      const isOrgSwitch = currentUser.organizationId !== org.id;
      if (isOrgSwitch) {
        void queryClient?.cancelQueries();
      }
      const isOwner = Boolean(
        (org as { ownerId?: string })?.ownerId &&
        (org as { ownerId?: string }).ownerId === currentUser.id,
      );
      const updated: User = {
        ...currentUser,
        organizationId: org.id,
        organization: org,
        isOwner,
        role: isOwner
          ? "ADMIN"
          : (updatedRole as User["role"]) || currentUser.role,
      };
      userRef.current = updated;
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      setAuthCookies(token, true);
      queryClient?.setQueryData(queryKeys.myOrg(org.id), org);
      queryClient?.setQueryData(queryKeys.myOrg(), org);
      if (isOrgSwitch && typeof window !== "undefined") {
        window.dispatchEvent(new Event("haihire:auth-refreshed"));
      }
    },
    [queryClient, token, user],
  );

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    sessionEpochRef.current += 1;
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = { ...prev, ...updatedFields };
      userRef.current = next;
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
