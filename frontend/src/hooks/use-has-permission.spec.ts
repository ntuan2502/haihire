import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHasPermission } from "./use-has-permission";
import * as AuthContextModule from "@/context/auth-context";
import { Role, type User } from "@haihire/shared";

describe("useHasPermission hook", () => {
  const mockUserRole = (role: Role | null, isOwner = false) => {
    const mockUser: User | null = role
      ? {
          id: "u-1",
          email: "user@example.com",
          name: "Test User",
          role,
          isOwner,
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
      isAdmin: role === Role.ADMIN,
      isMember: role === Role.MEMBER,
      isOwner,
      canEdit: role === Role.ADMIN || isOwner,
    });
  };

  it("returns false if user is not authenticated", () => {
    mockUserRole(null);
    const { result } = renderHook(() => useHasPermission("job:create"));
    expect(result.current).toBe(false);
  });

  it("returns true for owner on any permission (including billing and sensitive actions)", () => {
    mockUserRole(Role.ADMIN, true);
    const { result: billing } = renderHook(() =>
      useHasPermission("org:manage_billing"),
    );
    expect(billing.current).toBe(true);

    const { result: orgDelete } = renderHook(() =>
      useHasPermission("org:delete"),
    );
    expect(orgDelete.current).toBe(true);

    const { result: jobDelete } = renderHook(() =>
      useHasPermission("job:delete"),
    );
    expect(jobDelete.current).toBe(true);
  });

  it("returns true for non-owner ADMIN on org:manage_members & org:update, but false on org:manage_billing", () => {
    mockUserRole(Role.ADMIN, false);
    const { result: members } = renderHook(() =>
      useHasPermission("org:manage_members"),
    );
    expect(members.current).toBe(true);

    const { result: update } = renderHook(() => useHasPermission("org:update"));
    expect(update.current).toBe(true);

    const { result: billing } = renderHook(() =>
      useHasPermission("org:manage_billing"),
    );
    expect(billing.current).toBe(false);
  });

  it("returns true for RECRUITER on job:create, but false on org:manage_billing", () => {
    mockUserRole(Role.RECRUITER, false);
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
    mockUserRole(Role.HIRING_MANAGER, false);
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
    mockUserRole(Role.INTERVIEWER, false);
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
    mockUserRole(Role.MEMBER, false);
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
