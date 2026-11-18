import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Permission } from "@haihire/shared";
import type { User } from "@/types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "./dashboard-header";

const { mockPathname, mockPermissions } = vi.hoisted(() => ({
  mockPathname: { current: "/dashboard" },
  mockPermissions: { allowed: null as Set<Permission> | null },
}));

const mockUser: User = {
  id: "user-1",
  email: "admin@haihire.vn",
  firstName: "Hai",
  lastName: "Admin",
  name: "Hai Admin",
  role: "ADMIN",
  organizationId: "org-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
  useRouter: () => ({
    push: vi.fn(),
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
    isAuthenticated: true,
  }),
}));

vi.mock("@/components/layout/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

function renderHeader() {
  return render(
    <SidebarProvider>
      <DashboardHeader />
    </SidebarProvider>,
  );
}

describe("DashboardHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = "/dashboard";
    mockPermissions.allowed = null;
  });

  it("renders single-item Dashboard breadcrumb on /dashboard", () => {
    renderHeader();

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(breadcrumb).toHaveTextContent("Tổng quan");
  });

  it("renders multi-level breadcrumbs for flat workspace routes", () => {
    mockPathname.current = "/jobs/new";
    const { rerender } = renderHeader();

    const jobsLink = screen.getByRole("link", { name: "Tin tuyển dụng" });
    expect(jobsLink).toHaveAttribute("href", "/jobs");
    expect(
      screen.getByText("Tạo tin mới", { selector: '[aria-current="page"]' }),
    ).toBeInTheDocument();

    mockPathname.current = "/settings/members";
    rerender(
      <SidebarProvider>
        <DashboardHeader />
      </SidebarProvider>,
    );

    const settingsLink = screen.getByRole("link", { name: "Cài đặt" });
    expect(settingsLink).toHaveAttribute("href", "/settings");
    expect(
      screen.getByText("Thành viên", { selector: '[aria-current="page"]' }),
    ).toBeInTheDocument();
  });

  it("renders quick actions when job:create is permitted and hides New Job button when denied", () => {
    const { rerender } = renderHeader();

    const newJobLink = screen.getByRole("link", { name: "Tạo tin mới" });
    expect(newJobLink).toHaveAttribute("href", "/jobs/new");
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /chủ đề|theme|giao diện/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /tiếng việt/i }),
    ).toBeInTheDocument();

    mockPermissions.allowed = new Set<Permission>();
    rerender(
      <SidebarProvider>
        <DashboardHeader />
      </SidebarProvider>,
    );

    expect(
      screen.queryByRole("link", { name: "Tạo tin mới" }),
    ).not.toBeInTheDocument();
  });
});
