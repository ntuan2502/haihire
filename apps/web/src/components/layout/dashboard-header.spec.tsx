import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { User } from "@/types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "./dashboard-header";

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: { current: "/dashboard" },
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

    mockPathname.current = "/account";
    rerender(
      <SidebarProvider>
        <DashboardHeader />
      </SidebarProvider>,
    );

    expect(
      screen.queryByRole("link", { name: "Cài đặt" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Tài khoản", { selector: '[aria-current="page"]' }),
    ).toBeInTheDocument();
  });

  it("renders utility controls in the header without a duplicate global New Job CTA", () => {
    renderHeader();

    expect(
      screen.queryByRole("link", { name: "Tạo tin mới" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /chủ đề|theme|giao diện/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /tiếng việt/i }),
    ).toBeInTheDocument();
  });
});
