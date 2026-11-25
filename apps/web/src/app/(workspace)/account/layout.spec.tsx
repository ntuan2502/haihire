import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountLayout from "./layout";

let mockPathname = "/account";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/hooks/use-account-security", () => ({
  useUserSessionsQuery: () => ({
    data: [
      { id: "sess-1", isCurrent: true },
      { id: "sess-2", isCurrent: false },
    ],
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "settings.tabs.account": "Tài khoản",
        "settings.accountProfileDesc": "Quản lý hồ sơ cá nhân và bảo mật.",
        "settings.tabs.accountProfile": "Hồ sơ & Tùy chọn",
        "settings.tabs.accountSecurity": "Bảo mật & Phiên đăng nhập",
        "settings.tabs.accountNotifications": "Thông báo",
      };
      return dict[key] || key;
    },
  }),
}));

describe("AccountLayout", () => {
  beforeEach(() => {
    mockPathname = "/account";
  });

  it("renders account shell, header, and 3 navigation sub-tabs with session count badge", () => {
    render(
      <AccountLayout>
        <div data-testid="child-slot">Child content</div>
      </AccountLayout>,
    );

    expect(screen.getByTestId("account-shell")).toBeInTheDocument();
    expect(screen.getByTestId("account-content")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tài khoản" }),
    ).toBeInTheDocument();

    const profileLink = screen.getByRole("link", {
      name: /Hồ sơ & Tùy chọn/,
    });
    const securityLink = screen.getByRole("link", {
      name: /Bảo mật & Phiên đăng nhập/,
    });
    const notificationsLink = screen.getByRole("link", {
      name: /Thông báo/,
    });

    expect(profileLink).toHaveAttribute("href", "/account");
    expect(profileLink).toHaveAttribute("aria-current", "page");
    expect(securityLink).toHaveAttribute("href", "/account/security");
    expect(securityLink).toHaveTextContent("2");
    expect(notificationsLink).toHaveAttribute("href", "/account/notifications");
    expect(screen.getByTestId("child-slot")).toBeInTheDocument();
  });

  it("marks security tab active when pathname is /account/security", () => {
    mockPathname = "/account/security";
    render(
      <AccountLayout>
        <div>Security</div>
      </AccountLayout>,
    );

    const securityLink = screen.getByRole("link", {
      name: /Bảo mật & Phiên đăng nhập/,
    });
    expect(securityLink).toHaveAttribute("aria-current", "page");
  });
});
