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
import type { Permission } from "@haihire/shared";
import type { User, Organization } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialPermissions?: Permission[] | null;
  login: (email: string, password: string) => Promise<User>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<User>;
  logout: {
    (options?: { redirectTo?: string }): Promise<void> | void;
    (event?: unknown): Promise<void> | void;
  };
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

function setAuthCookies(hasOrg: boolean) {
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

export interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
  initialPermissions?: Permission[] | null;
  initialHasSessionHint?: boolean;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialPermissions = null,
  initialHasSessionHint,
}: AuthProviderProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  const queryClient = useContext(QueryClientContext) ?? null;
  const { t } = useOptionalI18n();
  const [user, setUser] = useState<User | null>(() => initialUser ?? null);
  const [loading, setLoading] = useState<boolean>(() =>
    initialUser ? false : initialHasSessionHint === false ? false : true,
  );
  const [ssrPermissions, setSsrPermissions] = useState<{
    orgId: string | null;
    role: string | null;
    permissions: Permission[];
  } | null>(() =>
    initialUser && Array.isArray(initialPermissions)
      ? {
          orgId: initialUser.organizationId ?? null,
          role: initialUser.role ?? null,
          permissions: initialPermissions,
        }
      : null,
  );
  const userRef = useRef<User | null>(initialUser ?? null);
  const tRef = useRef(t);
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    routerRef.current = router;
    userRef.current = user;
    tRef.current = t;
  }, [router, user, t]);

  const setSession = useCallback(
    (
      _newAccessToken: string,
      _newRefreshToken?: string,
      newUserData?: User,
    ) => {
      sessionEpochRef.current += 1;
      if (newUserData) {
        userRef.current = newUserData;
        setUser(newUserData);
        localStorage.setItem(USER_KEY, JSON.stringify(newUserData));
        setAuthCookies(Boolean(newUserData.organizationId));
      } else if (user) {
        setAuthCookies(Boolean(user.organizationId));
      } else {
        setAuthCookies(false);
      }
    },
    [user],
  );

  const logout = useCallback(
    async (optionsOrEvent?: { redirectTo?: string } | unknown) => {
      const redirectTo =
        optionsOrEvent &&
        typeof optionsOrEvent === "object" &&
        "redirectTo" in optionsOrEvent &&
        typeof (optionsOrEvent as { redirectTo?: unknown }).redirectTo ===
          "string"
          ? (optionsOrEvent as { redirectTo: string }).redirectTo
          : "/auth/login";
      sessionEpochRef.current += 1;
      userRef.current = null;
      setUser(null);
      setSsrPermissions(null);
      localStorage.removeItem(USER_KEY);
      queryClient?.clear();
      try {
        await api.post("/auth/logout");
      } catch {
        // Best-effort cleanup of HttpOnly session cookies
      }
      clearAuthCookies();
      routerRef.current.replace(redirectTo);
      routerRef.current.refresh?.();
    },
    [queryClient],
  );

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
      setAuthCookies(Boolean(latestUser.organizationId));

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
            localStorage.getItem(USER_KEY)),
        );
        const onSessionRoute =
          typeof window !== "undefined" &&
          isSessionRequiredRoute(window.location.pathname);

        sessionEpochRef.current += 1;
        userRef.current = null;
        setUser(null);
        setSsrPermissions(null);
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

  // Initialize auth state from SSR preloaded session, or cookie/localStorage fallback
  useEffect(() => {
    if (sessionEpochRef.current !== 0) {
      return;
    }

    if (initialUser) {
      userRef.current = initialUser;
      setUser(initialUser);
      localStorage.setItem(USER_KEY, JSON.stringify(initialUser));
      setAuthCookies(Boolean(initialUser.organizationId));
      if (initialUser.organization) {
        queryClient?.setQueryData(
          queryKeys.myOrg(initialUser.organization.id),
          initialUser.organization,
        );
        queryClient?.setQueryData(queryKeys.myOrg(), initialUser.organization);
      }
      if (Array.isArray(initialPermissions) && initialUser.organizationId) {
        queryClient?.setQueryData(
          queryKeys.myPermissions(initialUser.organizationId, initialUser.role),
          { permissions: initialPermissions },
        );
      }
      setLoading(false);
      return;
    }

    if (initialHasSessionHint === false) {
      userRef.current = null;
      setUser(null);
      localStorage.removeItem(USER_KEY);
      clearAuthCookies();
      setLoading(false);
      return;
    }

    let hasOptimisticSession = false;
    try {
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedUser) {
        const parsedUser: User = JSON.parse(savedUser);
        userRef.current = parsedUser;
        setUser(parsedUser);
        setAuthCookies(Boolean(parsedUser.organizationId));
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
  }, [
    refreshUser,
    initialUser,
    initialPermissions,
    initialHasSessionHint,
    queryClient,
  ]);

  // Synchronize auth expiry from background Axios / SSE refresh rejections
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleAuthExpired = () => {
      sessionEpochRef.current += 1;
      userRef.current = null;
      setUser(null);
      setSsrPermissions(null);
      localStorage.removeItem(USER_KEY);
      queryClient?.clear();
      if (isSessionRequiredRoute(window.location.pathname)) {
        routerRef.current.replace("/auth/login");
        routerRef.current.refresh?.();
      }
    };
    window.addEventListener("haihire:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("haihire:auth-expired", handleAuthExpired);
    };
  }, [queryClient]);

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

    const { user: userData } = response.data;

    sessionEpochRef.current += 1;
    userRef.current = userData;
    setUser(userData);
    setSsrPermissions(null);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(Boolean(userData.organizationId));

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

    const { user: userData } = response.data;

    sessionEpochRef.current += 1;
    userRef.current = userData;
    setUser(userData);
    setSsrPermissions(null);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setAuthCookies(Boolean(userData.organizationId));

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
      const nextRole = isOwner
        ? "ADMIN"
        : (updatedRole as User["role"]) || currentUser.role;
      const updated: User = {
        ...currentUser,
        organizationId: org.id,
        organization: org,
        isOwner,
        role: nextRole,
      };
      if (isOrgSwitch || nextRole !== currentUser.role) {
        setSsrPermissions(null);
      }
      userRef.current = updated;
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      setAuthCookies(true);
      queryClient?.setQueryData(queryKeys.myOrg(org.id), org);
      queryClient?.setQueryData(queryKeys.myOrg(), org);
      if (isOrgSwitch && typeof window !== "undefined") {
        window.dispatchEvent(new Event("haihire:auth-refreshed"));
      }
    },
    [queryClient, user],
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
  const activeInitialPermissions =
    ssrPermissions &&
    user &&
    ssrPermissions.orgId === (user.organizationId ?? null) &&
    ssrPermissions.role === (user.role ?? null)
      ? ssrPermissions.permissions
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialPermissions: activeInitialPermissions,
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
      loading: false,
      initialPermissions: null,
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
