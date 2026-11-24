import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import GeneralSettingsPage from "./page";
import * as AuthContextModule from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import { Role, type Permission, type User } from "@haihire/shared";
import { toast } from "@/lib/toast";

const { mockUploadLogoMutate, mockDeleteLogoMutate, mockOrgState } = vi.hoisted(
  () => ({
    mockUploadLogoMutate: vi.fn(),
    mockDeleteLogoMutate: vi.fn(),
    mockOrgState: {
      current: {
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
        ownerId: "owner-1",
        logoUrl: null as string | null,
      },
    },
  }),
);

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: vi.fn(),
}));

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
    data: mockOrgState.current,
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
  useUploadOrgLogoMutation: () => ({
    mutateAsync: mockUploadLogoMutate,
    isPending: false,
  }),
  useDeleteOrgLogoMutation: () => ({
    mutateAsync: mockDeleteLogoMutate,
    isPending: false,
  }),
}));

describe("GeneralSettingsPage - Ownership Controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useHasPermission).mockReturnValue(true);
    mockOrgState.current = {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      ownerId: "owner-1",
      logoUrl: null,
    };
  });

  const setupAuthMock = (
    isOwner: boolean,
    role: Role = Role.ADMIN,
    grantedPermissions: Permission[] = ["org:view", "org:update"],
  ) => {
    const permSet = new Set(grantedPermissions);
    vi.mocked(useHasPermission).mockImplementation((perm) => permSet.has(perm));
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

  it("delete organization confirmation always requires persisted org slug even after editing unsaved slug field", () => {
    setupAuthMock(true);

    render(<GeneralSettingsPage />);

    const slugInput = screen.getByLabelText("settings.urlSlug");
    fireEvent.change(slugInput, { target: { value: "unsaved-draft-slug" } });

    fireEvent.click(screen.getByRole("button", { name: "common.delete" }));

    const dialog = screen.getByRole("dialog");
    const confirmInput = within(dialog).getByRole("textbox");
    const confirmBtn = within(dialog).getByRole("button", {
      name: "settings.deleteOrgButton",
    });

    fireEvent.change(confirmInput, { target: { value: "unsaved-draft-slug" } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: "acme-corp" } });
    expect(confirmBtn).toBeEnabled();
  });

  it("shows standardized read-only banner and omits save button when user has org:view without org:update", () => {
    setupAuthMock(false, Role.RECRUITER, ["org:view"]);

    render(<GeneralSettingsPage />);

    expect(screen.getByText("settings.readOnlyAdmin")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "common.saveChanges" }),
    ).not.toBeInTheDocument();
  });

  it("renders 403 StatusState when user lacks org:view", () => {
    setupAuthMock(false, Role.MEMBER, []);

    render(<GeneralSettingsPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have permission to access this section. Please contact your administrator if you need access.",
    );
    expect(
      screen.queryByPlaceholderText("settings.placeholders.orgName"),
    ).not.toBeInTheDocument();
  });

  it("allows users with org:update to upload valid PNG logo, rejects SVG client-side, and confirms logo removal", async () => {
    mockOrgState.current.logoUrl = "/organizations/public/org-1/logo?v=10";
    mockUploadLogoMutate.mockResolvedValueOnce({
      ...mockOrgState.current,
      logoUrl: "/organizations/public/org-1/logo?v=20",
    });
    mockDeleteLogoMutate.mockResolvedValueOnce({
      ...mockOrgState.current,
      logoUrl: null,
    });
    setupAuthMock(false, Role.RECRUITER, ["org:view", "org:update"]);

    render(<GeneralSettingsPage />);

    const fileInput = screen.getByLabelText(
      "settings.logo.changeButton",
    ) as HTMLInputElement;

    const svgFile = new File(["<svg></svg>"], "malicious.svg", {
      type: "image/svg+xml",
    });
    fireEvent.change(fileInput, { target: { files: [svgFile] } });
    expect(toast.error).toHaveBeenCalledWith("settings.logo.invalidTypeError");
    expect(mockUploadLogoMutate).not.toHaveBeenCalled();

    const pngFile = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      "logo.png",
      {
        type: "image/png",
      },
    );
    fireEvent.change(fileInput, { target: { files: [pngFile] } });
    await waitFor(() => {
      expect(mockUploadLogoMutate).toHaveBeenCalledWith(pngFile);
    });

    fireEvent.click(
      screen.getByRole("button", { name: "settings.logo.removeButton" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "settings.logo.removeConfirmAction",
      }),
    );
    await waitFor(() => {
      expect(mockDeleteLogoMutate).toHaveBeenCalledTimes(1);
    });
  });

  it("hides logo upload and remove controls when user lacks org:update", () => {
    mockOrgState.current.logoUrl = "/organizations/public/org-1/logo?v=10";
    setupAuthMock(false, Role.RECRUITER, ["org:view"]);

    render(<GeneralSettingsPage />);

    expect(screen.getByRole("img", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getByText("settings.readOnlyAdmin")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /settings\.logo\.(upload|change|remove)Button/,
      }),
    ).not.toBeInTheDocument();
  });
});
