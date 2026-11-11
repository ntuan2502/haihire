import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
