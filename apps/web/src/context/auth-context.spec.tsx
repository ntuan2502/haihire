import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { api } from "@/lib/api/client";

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock api client
vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: {} }),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
  getApiBaseUrl: () => "/api",
}));

describe("AuthProvider - Route-Aware 401 Session Interception (H-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const setWindowPath = (pathname: string) => {
    window.history.pushState({}, "", pathname);
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("does NOT redirect to /auth/login when 401 occurs on public /careers route", async () => {
    setWindowPath("/careers/acme-corp/software-engineer");
    vi.mocked(api.get).mockRejectedValueOnce({
      response: { status: 401 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does NOT redirect to /auth/login when 401 occurs on public /auth/join invitation route", async () => {
    setWindowPath("/auth/join/sample-invite-token");
    vi.mocked(api.get).mockRejectedValueOnce({
      response: { status: 401 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /auth/login when 401 occurs on protected /dashboard route", async () => {
    setWindowPath("/dashboard/jobs");
    vi.mocked(api.get).mockRejectedValueOnce({
      response: { status: 401 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });

  it("redirects to /auth/login and calls /auth/logout when 401 occurs on /auth/onboarding route", async () => {
    setWindowPath("/auth/onboarding");
    vi.mocked(api.get).mockRejectedValue({
      response: { status: 401 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("explicit logout() awaits /auth/logout before redirecting to /auth/login regardless of path", async () => {
    setWindowPath("/careers/acme-corp");

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("preserves haihire_has_org=true when refreshUser succeeds via HttpOnly cookie without localStorage token", async () => {
    setWindowPath("/dashboard");
    document.cookie = "haihire_has_org=; path=/; max-age=0";
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: "user-1",
        email: "user@test.local",
        name: "Test User",
        role: "ADMIN",
        organizationId: "org-1",
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(document.cookie).toContain("haihire_has_org=true");
  });

  it("keeps loading=true until initial refreshUser resolves when localStorage is empty", async () => {
    setWindowPath("/auth/onboarding");
    let resolveMe!: (val: unknown) => void;
    vi.mocked(api.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMe = resolve;
        }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveMe({
        data: {
          id: "u-cookie",
          email: "u@test.local",
          name: "Cookie User",
          role: "MEMBER",
          organizationId: null,
        },
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

interface MockEventSourceInstance {
  url: string;
  withCredentials?: boolean;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
}

describe("AuthProvider - Real-Time SSE Sync", () => {
  const originalEventSource = globalThis.EventSource;
  let latestSource: MockEventSourceInstance | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockReset();
    localStorage.clear();
    latestSource = null;

    const recordSource = (source: MockEventSourceInstance) => {
      latestSource = source;
    };

    class MockEventSource implements MockEventSourceInstance {
      url: string;
      withCredentials?: boolean;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      close = vi.fn();

      constructor(url: string, init?: EventSourceInit) {
        this.url = url;
        this.withCredentials = init?.withCredentials;
        recordSource(this);
      }
    }

    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.EventSource = originalEventSource;
  });

  it("refreshes user, invalidates permission/org queries, and shows warning toast on self MEMBER_ROLE_UPDATED", async () => {
    window.history.pushState({}, "", "/dashboard/settings/members");
    const warnSpy = vi.spyOn(toast, "warning");
    const sseListener = vi.fn();
    window.addEventListener("ats:sse_event", sseListener);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: "u-1",
        email: "u1@test.local",
        name: "User One",
        role: "ADMIN",
        isOwner: false,
        organizationId: "org-1",
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.role).toBe("ADMIN");
      expect(latestSource).not.toBeNull();
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: "u-1",
        email: "u1@test.local",
        name: "User One",
        role: "MEMBER",
        isOwner: false,
        organizationId: "org-1",
      },
    });

    await act(async () => {
      latestSource?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "MEMBER_ROLE_UPDATED",
            targetUserId: "u-1",
            role: "MEMBER",
            orgId: "org-1",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.user?.role).toBe("MEMBER");
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(sseListener).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["auth", "me", "permissions"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["organization", "roles", "permissions"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["organization", "my"],
    });

    window.removeEventListener("ats:sse_event", sseListener);
  });

  it("warns and refreshes user on self MEMBER_REMOVED", async () => {
    window.history.pushState({}, "", "/dashboard/jobs");
    const warnSpy = vi.spyOn(toast, "warning");
    const queryClient = new QueryClient();

    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          id: "u-2",
          email: "u2@test.local",
          name: "User Two",
          role: "MEMBER",
          isOwner: false,
          organizationId: "org-1",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "u-2",
          email: "u2@test.local",
          name: "User Two",
          role: "MEMBER",
          isOwner: false,
          organizationId: null,
        },
      });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.id).toBe("u-2");
      expect(latestSource).not.toBeNull();
    });

    await act(async () => {
      latestSource?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "MEMBER_REMOVED",
            targetUserId: "u-2",
            orgId: "org-1",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/auth/onboarding");
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("coalesces domain SSE updates and invalidates matching queries automatically", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: "u-3",
        email: "u3@test.local",
        name: "User Three",
        role: "RECRUITER",
        isOwner: false,
        organizationId: "org-1",
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.id).toBe("u-3");
      expect(latestSource).not.toBeNull();
    });

    vi.useFakeTimers();

    act(() => {
      latestSource?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "APPLICATIONS_CHANGED",
            orgId: "org-1",
          }),
        }),
      );
      latestSource?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "CANDIDATES_CHANGED",
            orgId: "org-1",
          }),
        }),
      );
    });

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["applications"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["job-applications"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["candidates"],
    });
  });

  it("notifies only matching non-admin members on PERMISSIONS_CHANGED", async () => {
    const infoSpy = vi.spyOn(toast, "info");
    const queryClient = new QueryClient();

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: "u-4",
        email: "u4@test.local",
        name: "User Four",
        role: "MEMBER",
        isOwner: false,
        organizationId: "org-1",
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.id).toBe("u-4");
      expect(latestSource).not.toBeNull();
    });

    act(() => {
      latestSource?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "PERMISSIONS_CHANGED",
            orgId: "org-1",
            role: "RECRUITER",
          }),
        }),
      );
    });
    expect(infoSpy).not.toHaveBeenCalled();

    act(() => {
      latestSource?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "PERMISSIONS_CHANGED",
            orgId: "org-1",
            role: "MEMBER",
          }),
        }),
      );
    });
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });
});
