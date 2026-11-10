import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { api } from "@/lib/api/client";

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
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

  it("redirects to /auth/login when 401 occurs on /auth/onboarding route", async () => {
    setWindowPath("/auth/onboarding");
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

  it("explicit logout() call always redirects to /auth/login regardless of path", () => {
    setWindowPath("/careers/acme-corp");

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });
});
