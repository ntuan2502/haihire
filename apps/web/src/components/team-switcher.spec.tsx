import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Organization, User } from "@/types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";

const { mockPush, mockSwitchMutate } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSwitchMutate: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const orgsState: { active: Organization; list: Organization[] } = {
  active: {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme-corp",
    logoUrl: "/organizations/public/org-1/logo?v=1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  list: [],
};

const mockUser = (): User => ({
  id: "user-1",
  email: "owner@acme.com",
  name: "Acme Owner",
  role: "ADMIN",
  organizationId: orgsState.active.id,
  organization: orgsState.active,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockUser(),
    isOwner: true,
  }),
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrgs: () => ({
    data: orgsState.list,
  }),
  useSwitchOrgMutation: () => ({
    mutateAsync: mockSwitchMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("TeamSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgsState.active = {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      logoUrl: "/organizations/public/org-1/logo?v=1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    orgsState.list = [
      orgsState.active,
      {
        id: "org-2",
        name: "Beta Labs",
        slug: "beta-labs",
        logoUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
  });

  it("renders uploaded organization logo image in trigger and initials fallback when logoUrl is null", async () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <TeamSwitcher />
      </SidebarProvider>,
    );

    const triggerImg = container.querySelector("img");
    expect(triggerImg).toHaveAttribute(
      "src",
      "/api/organizations/public/org-1/logo?v=1",
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: /Acme Corp/i }), {
      button: 0,
      ctrlKey: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Beta Labs")).toBeInTheDocument();
    });
    expect(screen.getByText("BL")).toBeInTheDocument();
  });
});
