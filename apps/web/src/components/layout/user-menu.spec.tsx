import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserMenu } from "./user-menu";
import type { User, Organization } from "@/types";

const mockPush = vi.fn();
const mockLogout = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockUser: User = {
  id: "user-1",
  email: "admin@haihire.vn",
  name: "Hai Admin",
  role: "ADMIN",
  organizationId: "org-1",
  organization: {
    id: "org-1",
    name: "HaiHire Corp",
    slug: "haihire-corp",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOrgs: Organization[] = [
  {
    id: "org-1",
    name: "HaiHire Corp",
    slug: "haihire-corp",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "org-2",
    name: "Partner Org",
    slug: "partner-org",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    isOwner: true,
    isAdmin: true,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useMyOrgs: () => ({
    data: mockOrgs,
  }),
  useSwitchOrgMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("UserMenu Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger and opens menu with keyboard-accessible items", async () => {
    render(<UserMenu />);

    const trigger = screen.getByRole("button", { name: "User Profile" });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("nav.signOut")).toBeInTheDocument();
    });

    const signOutBtn = screen.getByRole("menuitem", { name: /nav\.signOut/i });
    expect(signOutBtn).toBeInTheDocument();
    expect(signOutBtn.tagName).toBe("BUTTON");

    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("has keyboard-accessible organization switcher and items", async () => {
    render(<UserMenu />);

    const trigger = screen.getByRole("button", { name: "User Profile" });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("HaiHire Corp")).toBeInTheDocument();
    });

    const orgSwitcherBtn = screen.getByRole("button", {
      name: "HaiHire Corp",
    });
    expect(orgSwitcherBtn).toBeInTheDocument();
    expect(orgSwitcherBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(orgSwitcherBtn);
    expect(orgSwitcherBtn).toHaveAttribute("aria-expanded", "true");

    const partnerOrgBtn = screen.getByRole("menuitem", {
      name: "Partner Org",
    });
    expect(partnerOrgBtn).toBeInTheDocument();
    expect(partnerOrgBtn.tagName).toBe("BUTTON");

    fireEvent.click(partnerOrgBtn);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("org-2");
    });
  });

  it("has keyboard-accessible settings button", async () => {
    render(<UserMenu />);

    const trigger = screen.getByRole("button", { name: "User Profile" });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("nav.settings")).toBeInTheDocument();
    });

    const settingsBtn = screen.getByRole("menuitem", {
      name: /nav\.settings/i,
    });
    expect(settingsBtn).toBeInTheDocument();
    expect(settingsBtn.tagName).toBe("BUTTON");

    fireEvent.click(settingsBtn);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/settings");
  });
});
