import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navbar } from "./navbar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      name: "Admin User",
      email: "admin@haihire.vn",
      role: "ADMIN",
      organizationId: "org-1",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "vi",
  }),
}));

vi.mock("@/components/shared/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/shared/language-dropdown", () => ({
  LanguageDropdown: () => <div data-testid="language-dropdown" />,
}));

vi.mock("@/components/layout/user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

vi.mock("@/components/layout/mobile-drawer", () => ({
  MobileDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="mobile-drawer" /> : null,
}));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render Coming Soon or unimplemented More navigation placeholders", () => {
    render(
      <Navbar
        activeTab="dashboard"
        onOpenCreateJob={vi.fn()}
        jobsCount={5}
        candidatesCount={12}
      />,
    );

    expect(screen.getByText("nav.dashboard")).toBeInTheDocument();
    expect(screen.getByText("nav.jobs")).toBeInTheDocument();
    expect(screen.getByText("nav.candidates")).toBeInTheDocument();
    expect(screen.getByText("nav.applications")).toBeInTheDocument();
    expect(screen.getByText("nav.interviews")).toBeInTheDocument();
    expect(screen.getByText("nav.settings")).toBeInTheDocument();

    expect(screen.queryByText("nav.more")).not.toBeInTheDocument();
    expect(screen.queryByText("nav.moreComingSoon")).not.toBeInTheDocument();
    expect(screen.queryByText(/Coming Soon/i)).not.toBeInTheDocument();
  });
});
