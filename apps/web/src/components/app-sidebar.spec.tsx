import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Permission } from "@haihire/shared";
import type { Organization, User } from "@/types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const {
  mockPush,
  mockPathname,
  mockPermissions,
  mockLogout,
  mockSwitchMutate,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockPathname: { current: "/dashboard" },
  mockPermissions: { allowed: null as Set<Permission> | null },
  mockLogout: vi.fn().mockResolvedValue(undefined),
  mockSwitchMutate: vi.fn().mockResolvedValue({}),
}));

const mockOrganization: Organization = {
  id: "org-1",
  name: "HaiHire Corp",
  slug: "haihire-corp",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockUser: User = {
  id: "user-1",
  email: "admin@haihire.vn",
  firstName: "Hai",
  lastName: "Admin",
  name: "Hai Admin",
  role: "ADMIN",
  organizationId: "org-1",
  organization: mockOrganization,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: (permission: Permission) => {
    if (mockPermissions.allowed === null) return true;
    return mockPermissions.allowed.has(permission);
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isOwner: true,
    logout: mockLogout,
  }),
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrgs: () => ({
    data: [mockOrganization],
  }),
  useSwitchOrgMutation: () => ({
    mutateAsync: mockSwitchMutate,
    isPending: false,
  }),
}));

function renderAppSidebar(defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
    </SidebarProvider>,
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = "/dashboard";
    mockPermissions.allowed = null;
  });

  it("renders all permitted ATS main routes with active state and removes placeholders", () => {
    mockPathname.current = "/jobs/job-123";
    renderAppSidebar();

    expect(screen.getByRole("link", { name: "Tổng quan" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    const jobsLink = screen.getByRole("link", { name: "Tin tuyển dụng" });
    expect(jobsLink).toHaveAttribute("href", "/jobs");
    expect(jobsLink).toHaveAttribute("aria-current", "page");

    expect(screen.getByRole("link", { name: "Ứng viên" })).toHaveAttribute(
      "href",
      "/candidates",
    );
    expect(
      screen.getByRole("link", { name: "Hồ sơ ứng tuyển" }),
    ).toHaveAttribute("href", "/applications");
    expect(screen.getByRole("link", { name: "Phỏng vấn" })).toHaveAttribute(
      "href",
      "/interviews",
    );
    expect(
      screen.getByRole("link", { name: "Theo dõi nguồn" }),
    ).toHaveAttribute("href", "/source-tracking");

    expect(screen.getByRole("button", { name: "Cài đặt" })).toBeInTheDocument();

    expect(screen.queryByText("Playground")).not.toBeInTheDocument();
    expect(screen.queryByText("Design Engineering")).not.toBeInTheDocument();
  });

  it("filters main navigation and settings sub-items by RBAC permissions, excludes personal account/notifications, and hides Settings when empty", () => {
    mockPermissions.allowed = new Set<Permission>(["job:view"]);
    const { rerender } = renderAppSidebar();

    expect(screen.getByRole("link", { name: "Tổng quan" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tin tuyển dụng" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ứng viên" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Hồ sơ ứng tuyển" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Phỏng vấn" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Theo dõi nguồn" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cài đặt" }),
    ).not.toBeInTheDocument();

    mockPermissions.allowed = new Set<Permission>(["job:view", "org:view"]);
    rerender(
      <SidebarProvider defaultOpen>
        <AppSidebar />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(screen.getByRole("link", { name: "Chung" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ngôn ngữ & Khu vực" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Thông báo của tôi" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Tài khoản" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Thành viên" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Vai trò & Phân quyền" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Thanh toán & Gói")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Đăng nhập một lần (SSO)"),
    ).not.toBeInTheDocument();
  });

  it("auto-expands Settings when pathname is under /settings/* and highlights active sub-item", () => {
    mockPathname.current = "/settings/members";
    renderAppSidebar();

    const membersLink = screen.getByRole("link", { name: "Thành viên" });
    expect(membersLink).toHaveAttribute("href", "/settings/members");
    expect(membersLink).toHaveAttribute("aria-current", "page");
  });

  it("opens a floating Settings dropdown menu in collapsed desktop icon mode and navigates on select", async () => {
    renderAppSidebar(false);

    const settingsBtn = screen.getByRole("button", { name: "Cài đặt" });
    fireEvent.pointerDown(settingsBtn, { button: 0, ctrlKey: false });

    const generalItem = await screen.findByRole("menuitem", {
      name: "Chung",
    });
    expect(generalItem).toBeInTheDocument();

    fireEvent.click(generalItem);
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });
});
