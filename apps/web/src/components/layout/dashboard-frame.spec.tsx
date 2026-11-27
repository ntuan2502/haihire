import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import type { Organization, User } from "@/types";
import { DashboardFrame } from "./dashboard-frame";

const { mockPathname, mockActiveUser } = vi.hoisted(() => ({
  mockPathname: { current: "/dashboard" },
  mockActiveUser: { current: null as User | null },
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
    push: vi.fn(),
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockActiveUser.current ?? mockUser,
    isAuthenticated: true,
    isOwner: true,
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrgs: () => ({ data: [mockOrganization] }),
  useSwitchOrgMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/components/layout/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe("DashboardFrame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = "/dashboard";
    mockActiveUser.current = mockUser;
  });

  it("renders unified AppSidebar, DashboardHeader, main-content inset, and child content on /dashboard", () => {
    render(
      <DashboardFrame>
        <div data-testid="workspace-child">Overview</div>
      </DashboardFrame>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main.className).toContain("min-w-0");
    expect(main).toContainElement(screen.getByTestId("workspace-child"));
    expect(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    ).toHaveTextContent("Tổng quan");
    expect(
      screen.getByRole("link", { name: "Tin tuyển dụng" }),
    ).toHaveAttribute("href", "/jobs");
  });

  it("persists the same AppSidebar and DashboardHeader shell across sub-routes with dynamic breadcrumbs", () => {
    mockPathname.current = "/settings/members";
    render(
      <DashboardFrame>
        <div data-testid="workspace-child">Members Settings</div>
      </DashboardFrame>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByTestId("workspace-child")).toBeInTheDocument();

    const settingsBreadcrumb = screen
      .getByRole("navigation", { name: "breadcrumb" })
      .querySelector("ol");
    expect(settingsBreadcrumb).toHaveTextContent("Cài đặt");
    expect(settingsBreadcrumb).toHaveTextContent("Thành viên");

    const sidebar = document.querySelector(
      '[data-slot="sidebar"]',
    ) as HTMLElement;
    expect(sidebar).not.toBeNull();
    const membersSidebarLink = within(sidebar).getByRole("link", {
      name: "Thành viên",
    });
    expect(membersSidebarLink).toHaveAttribute("aria-current", "page");
  });

  it("remounts workspace children and resets local child state when active organizationId changes", () => {
    function StatefulWorkspaceChild() {
      const [draftFilter, setDraftFilter] = useState("initial");
      return (
        <div>
          <span data-testid="draft-filter">{draftFilter}</span>
          <button
            type="button"
            onClick={() => setDraftFilter("org-1-modified")}
          >
            Mutate local state
          </button>
        </div>
      );
    }

    const { rerender } = render(
      <DashboardFrame>
        <StatefulWorkspaceChild />
      </DashboardFrame>,
    );

    expect(screen.getByTestId("draft-filter")).toHaveTextContent("initial");
    fireEvent.click(screen.getByRole("button", { name: "Mutate local state" }));
    expect(screen.getByTestId("draft-filter")).toHaveTextContent(
      "org-1-modified",
    );

    mockActiveUser.current = {
      ...mockUser,
      organizationId: "org-2",
      organization: {
        ...mockOrganization,
        id: "org-2",
        name: "Org Two",
        slug: "org-two",
      },
    };

    rerender(
      <DashboardFrame>
        <StatefulWorkspaceChild />
      </DashboardFrame>,
    );

    expect(screen.getByTestId("draft-filter")).toHaveTextContent("initial");
  });

  it("blocks Ctrl+B sidebar shortcut when typing in input or when a dialog is open", () => {
    render(
      <DashboardFrame defaultSidebarOpen={true}>
        <input aria-label="Editor input" />
      </DashboardFrame>,
    );

    const sidebar = document.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    const input = screen.getByLabelText("Editor input");
    input.focus();
    fireEvent.keyDown(input, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    fireEvent.keyDown(document.body, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    dialog.remove();

    fireEvent.keyDown(document.body, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });
});
