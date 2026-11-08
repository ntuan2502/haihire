import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GeneralSettingsPage from "./page";
import * as AuthContextModule from "@/context/auth-context";
import { Role, type User } from "@haihire/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useMyOrg: () => ({
    data: {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      ownerId: "owner-1",
    },
    isLoading: false,
  }),
  useUpdateMyOrgMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteMyOrgMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("GeneralSettingsPage - Ownership Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupAuthMock = (isOwner: boolean, role: Role = Role.ADMIN) => {
    const user: User = {
      id: isOwner ? "owner-1" : "admin-2",
      name: isOwner ? "Owner User" : "Admin User",
      email: isOwner ? "owner@acme.com" : "admin@acme.com",
      role,
      isOwner,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user,
      token: "tok",
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUserOrg: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true,
      isAdmin: role === Role.ADMIN,
      isMember: role === Role.MEMBER,
      isOwner,
      canEdit: true,
    });
  };

  it("owner sees the Danger Zone card and delete organization action", () => {
    setupAuthMock(true);

    render(<GeneralSettingsPage />);

    expect(screen.getByText("settings.dangerZone")).toBeInTheDocument();
    expect(screen.getByText("settings.deleteOrg")).toBeInTheDocument();
  });

  it("non-owner admin does NOT see the Danger Zone card", () => {
    setupAuthMock(false);

    render(<GeneralSettingsPage />);

    expect(screen.queryByText("settings.dangerZone")).not.toBeInTheDocument();
    expect(screen.queryByText("settings.deleteOrg")).not.toBeInTheDocument();
  });
});
