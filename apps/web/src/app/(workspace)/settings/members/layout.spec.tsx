import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MembersSettingsLayout from "./layout";

let mockPathname = "/settings/members";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

let mockCanManageMembers = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanManageMembers,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u-1", organization: { name: "Acme" } },
  }),
}));

let mockMembersLoading = false;
let mockLinksLoading = false;
let capturedMembersOptions: { enabled?: boolean } | undefined;
let capturedLinksOptions:
  { enabled?: boolean; includeRevoked?: boolean } | undefined;

const mockMembers = [
  { id: "m-1" },
  { id: "m-2" },
  { id: "m-3" },
  { id: "m-4" },
];
const mockInvites = [
  {
    id: "e-1",
    inviteType: "EMAIL",
    invitedEmail: "a@example.com",
    status: "ACTIVE",
  },
  {
    id: "e-2",
    inviteType: "EMAIL",
    invitedEmail: "b@example.com",
    status: "EXPIRED",
  },
  {
    id: "e-revoked",
    inviteType: "EMAIL",
    invitedEmail: "c@example.com",
    status: "REVOKED",
    derivedStatus: "REVOKED",
  },
  { id: "l-1", inviteType: "LINK", invitedEmail: null, status: "ACTIVE" },
  {
    id: "l-revoked",
    inviteType: "LINK",
    invitedEmail: null,
    status: "REVOKED",
    derivedStatus: "REVOKED",
  },
];

vi.mock("@/hooks/use-queries", () => ({
  useOrgMembers: (options?: { enabled?: boolean }) => {
    capturedMembersOptions = options;
    return {
      data: mockMembersLoading ? [] : mockMembers,
      isLoading: mockMembersLoading,
    };
  },
  useInviteLinks: (options?: {
    enabled?: boolean;
    includeRevoked?: boolean;
  }) => {
    capturedLinksOptions = options;
    return {
      data: mockLinksLoading ? [] : mockInvites,
      isLoading: mockLinksLoading,
    };
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "members.title": "Quản lý thành viên",
        "members.subtitle": "Quản trị danh sách người dùng trong tổ chức",
        "members.tabMembers": "Thành viên",
        "members.tabEmailInvites": "Lời mời qua Email",
        "members.tabShareableLinks": "Liên kết chia sẻ",
        "members.inviteMemberTitle": "Mời thành viên",
      };
      return dict[key] || key;
    },
  }),
}));

describe("MembersSettingsLayout", () => {
  beforeEach(() => {
    mockPathname = "/settings/members";
    mockCanManageMembers = true;
    mockMembersLoading = false;
    mockLinksLoading = false;
    capturedMembersOptions = undefined;
    capturedLinksOptions = undefined;
  });

  it("blocks access, disables queries, and omits children when lacking org:manage_members", () => {
    mockCanManageMembers = false;

    render(
      <MembersSettingsLayout>
        <div data-testid="members-child">Protected Content</div>
      </MembersSettingsLayout>,
    );

    expect(capturedMembersOptions).toEqual({ enabled: false });
    expect(capturedLinksOptions).toEqual({
      enabled: false,
      includeRevoked: true,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have permission to access this section. Please contact your administrator if you need access.",
    );
    expect(screen.queryByTestId("members-child")).not.toBeInTheDocument();
  });

  it("renders 3 sub-tab route links with live non-revoked counts and omits global invite button", () => {
    mockPathname = "/settings/members/invitations";

    render(
      <MembersSettingsLayout>
        <div data-testid="members-child">Invitations Content</div>
      </MembersSettingsLayout>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("members-child")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mời thành viên" }),
    ).not.toBeInTheDocument();

    const membersLink = screen.getByRole("link", { name: /Thành viên/ });
    expect(membersLink).toHaveAttribute("href", "/settings/members");
    expect(membersLink).toHaveTextContent("4");
    expect(membersLink).not.toHaveAttribute("aria-current");

    const invitesLink = screen.getByRole("link", {
      name: /Lời mời qua Email/,
    });
    expect(invitesLink).toHaveAttribute(
      "href",
      "/settings/members/invitations",
    );
    expect(invitesLink).toHaveAttribute("aria-current", "page");
    expect(invitesLink).toHaveTextContent("2");

    const linksLink = screen.getByRole("link", { name: /Liên kết chia sẻ/ });
    expect(linksLink).toHaveAttribute("href", "/settings/members/links");
    expect(linksLink).toHaveTextContent("1");
    expect(linksLink).not.toHaveAttribute("aria-current");
  });

  it("keeps rendering children even while badge counts are still loading", () => {
    mockMembersLoading = true;
    mockLinksLoading = true;

    render(
      <MembersSettingsLayout>
        <div data-testid="members-child">Route Content</div>
      </MembersSettingsLayout>,
    );

    expect(screen.getByTestId("members-child")).toBeInTheDocument();
    const membersLink = screen.getByRole("link", { name: /Thành viên/ });
    expect(membersLink).toHaveAttribute("aria-current", "page");
    expect(membersLink).toHaveTextContent("Thành viên");
  });
});
