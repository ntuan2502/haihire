import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHasPermission } from "./use-has-permission";
import * as AuthContextModule from "@/context/auth-context";
import { Role, type User } from "@haihire/shared";

describe("useHasPermission hook", () => {
  const mockUserRole = (role: string | null) => {
    const mockUser: User | null = role
      ? {
          id: "u-1",
          email: "user@example.com",
          name: "Test User",
          role: role as (typeof Role)[keyof typeof Role],
          createdAt: "2026-01-01T00:00:00.000Z",
        }
      : null;

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockUser,
      token: "tok",
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUserOrg: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: Boolean(role),
      isAdmin: role === "ADMIN",
      isMember: role === "MEMBER",
      isOwner: role === "OWNER",
      canEdit: role === "ADMIN" || role === "OWNER",
    });
  };

  it("returns false if user is not authenticated", () => {
    mockUserRole(null);
    const { result } = renderHook(() => useHasPermission("job:create"));
    expect(result.current).toBe(false);
  });

  it("returns true for OWNER on any permission", () => {
    mockUserRole(Role.OWNER);
    const { result } = renderHook(() => useHasPermission("org:manage_billing"));
    expect(result.current).toBe(true);
  });

  it("returns true for ADMIN on org:manage_members, but false on org:manage_billing", () => {
    mockUserRole(Role.ADMIN);
    const { result: allowed } = renderHook(() =>
      useHasPermission("org:manage_members"),
    );
    expect(allowed.current).toBe(true);

    const { result: forbidden } = renderHook(() =>
      useHasPermission("org:manage_billing"),
    );
    expect(forbidden.current).toBe(false);
  });

  it("returns true for RECRUITER on job:create, but false on org:manage_billing", () => {
    mockUserRole(Role.RECRUITER);
    const { result: allowed } = renderHook(() =>
      useHasPermission("job:create"),
    );
    expect(allowed.current).toBe(true);

    const { result: forbidden } = renderHook(() =>
      useHasPermission("org:manage_billing"),
    );
    expect(forbidden.current).toBe(false);
  });

  it("returns true for HIRING_MANAGER on application:update_stage, but false on job:delete", () => {
    mockUserRole(Role.HIRING_MANAGER);
    const { result: allowed } = renderHook(() =>
      useHasPermission("application:update_stage"),
    );
    expect(allowed.current).toBe(true);

    const { result: forbidden } = renderHook(() =>
      useHasPermission("job:delete"),
    );
    expect(forbidden.current).toBe(false);
  });

  it("returns true for INTERVIEWER on interview:scorecard_submit, but false on job:delete", () => {
    mockUserRole(Role.INTERVIEWER);
    const { result: allowed } = renderHook(() =>
      useHasPermission("interview:scorecard_submit"),
    );
    expect(allowed.current).toBe(true);

    const { result: forbidden } = renderHook(() =>
      useHasPermission("job:delete"),
    );
    expect(forbidden.current).toBe(false);
  });

  it("returns false for MEMBER on write operations, but true on job:view", () => {
    mockUserRole(Role.MEMBER);
    const { result: viewAllowed } = renderHook(() =>
      useHasPermission("job:view"),
    );
    expect(viewAllowed.current).toBe(true);

    const { result: writeForbidden } = renderHook(() =>
      useHasPermission("job:create"),
    );
    expect(writeForbidden.current).toBe(false);
  });
});
