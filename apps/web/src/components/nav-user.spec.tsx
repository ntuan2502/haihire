import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User } from "@/types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

const { mockPush, mockLogout, mockSetOpenMobile } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockLogout: vi.fn().mockResolvedValue(undefined),
  mockSetOpenMobile: vi.fn(),
}));

const mockUser: User = {
  id: "user-1",
  email: "admin@haihire.vn",
  firstName: "Hai",
  lastName: "Admin",
  name: "Hai Admin",
  role: "ADMIN",
  organizationId: "org-1",
  organization: {
    id: "org-1",
    name: "HaiHire Corp",
    slug: "haihire-corp",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/components/ui/sidebar", async (importActual) => {
  const actual = await importActual<typeof import("@/components/ui/sidebar")>();
  return {
    ...actual,
    useSidebar: () => ({
      isMobile: false,
      setOpenMobile: mockSetOpenMobile,
    }),
  };
});

function renderNavUser() {
  return render(
    <SidebarProvider>
      <NavUser />
    </SidebarProvider>,
  );
}

function openUserMenu() {
  const trigger = screen.getByRole("button", { name: /admin@haihire\.vn/i });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
}

describe("NavUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders formatted user display name, email, and initials in trigger and menu header", async () => {
    renderNavUser();

    expect(screen.getByText("Admin Hai")).toBeInTheDocument();
    expect(screen.getByText("admin@haihire.vn")).toBeInTheDocument();
    expect(screen.getByText("AH")).toBeInTheDocument();

    openUserMenu();

    expect(
      await screen.findByRole("menuitem", { name: "Tài khoản" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
    expect(screen.getAllByText("Admin Hai")).toHaveLength(2);
    expect(screen.getAllByText("admin@haihire.vn")).toHaveLength(2);
  });

  it("navigates to Account settings when clicking Account", async () => {
    renderNavUser();
    openUserMenu();

    const accountItem = await screen.findByRole("menuitem", {
      name: "Tài khoản",
    });
    fireEvent.click(accountItem);

    expect(mockSetOpenMobile).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/settings/account");
  });

  it("navigates to Notification settings when clicking Notifications", async () => {
    renderNavUser();
    openUserMenu();

    const notificationsItem = await screen.findByRole("menuitem", {
      name: "Thông báo",
    });
    fireEvent.click(notificationsItem);

    expect(mockSetOpenMobile).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/settings/notifications");
  });

  it("logs out when clicking Sign out", async () => {
    renderNavUser();
    openUserMenu();

    const signOutItem = await screen.findByRole("menuitem", {
      name: "Đăng xuất",
    });
    fireEvent.click(signOutItem);

    expect(mockSetOpenMobile).toHaveBeenCalledWith(false);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
