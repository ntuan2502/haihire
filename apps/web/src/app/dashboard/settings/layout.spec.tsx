import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsLayout from "./layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/settings/localization",
}));

vi.mock("@/components/shared/auth-guard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <header data-testid="mock-navbar">Navbar</header>,
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("SettingsLayout", () => {
  it("renders separate vertical scroll containers for desktop sidebar menu and content pane", () => {
    render(
      <SettingsLayout>
        <div data-testid="child-panel">Panel Content</div>
      </SettingsLayout>,
    );

    const shell = screen.getByTestId("settings-shell");
    const sidebarNav = screen.getByTestId("settings-sidebar-nav");
    const content = screen.getByTestId("settings-content");

    expect(shell.className).toContain("md:h-screen");
    expect(shell.className).toContain("md:overflow-hidden");

    expect(sidebarNav.className).toContain("overflow-y-auto");
    expect(sidebarNav.className).toContain("min-h-0");

    expect(content.className).toContain("md:overflow-y-auto");
    expect(content.className).toContain("md:min-h-0");
    expect(content).toContainElement(screen.getByTestId("child-panel"));
  });
});
