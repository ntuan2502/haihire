import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import MembersSettingsPage from "./page";
import * as OrgQueriesModule from "@/hooks/use-organization-queries";

const mockCreateInviteMutateAsync = vi.fn();
const mockRevokeInviteMutateAsync = vi.fn();
const mockUpdateRoleMutateAsync = vi.fn();
const mockRemoveMemberMutateAsync = vi.fn();
const mockTransferOwnershipMutateAsync = vi.fn();
const mockRefetchLinks = vi.fn();
const mockRefreshUser = vi.fn();

let mockAuthUser = {
  id: "user-admin",
  name: "Admin User",
  email: "admin@haihire.vn",
  role: "ADMIN",
  isOwner: true,
  organization: { id: "org-1", ownerId: "mem-owner" },
};
let mockCanEdit = true;
let mockIsOwner = true;
let mockInviteLinks = [
  {
    id: "link-1",
    token: "tok-abc-123",
    role: "MEMBER",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    maxUses: 5,
    usesCount: 1,
  },
];

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    canEdit: mockCanEdit,
    isOwner: mockIsOwner,
    refreshUser: mockRefreshUser,
  }),
}));

const mockMembersList = [
  {
    id: "mem-owner",
    name: "Le Owner",
    email: "owner@haihire.vn",
    role: "ADMIN",
    isOwner: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-admin",
    name: "Admin User",
    email: "admin@haihire.vn",
    role: "ADMIN",
    isOwner: false,
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "mem-1",
    name: "Nguyen Recruiter",
    email: "recruiter@haihire.vn",
    role: "ADMIN",
    isOwner: false,
    createdAt: "2026-01-03T00:00:00Z",
  },
  {
    id: "mem-2",
    name: "Tran Interviewer",
    email: "interviewer@haihire.vn",
    role: "MEMBER",
    isOwner: false,
    createdAt: "2026-01-04T00:00:00Z",
  },
];

let capturedMembersOptions: { enabled?: boolean } | undefined;
let capturedInviteLinksOptions: { enabled?: boolean } | undefined;

vi.mock("@/hooks/use-queries", () => ({
  useOrgMembers: (options?: { enabled?: boolean }) => {
    capturedMembersOptions = options;
    return {
      data: mockMembersList,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
  useInviteLinks: (options?: { enabled?: boolean }) => {
    capturedInviteLinksOptions = options;
    return {
      data: mockInviteLinks,
      refetch: mockRefetchLinks,
    };
  },
  useCreateInviteLinkMutation: () => ({
    mutateAsync: mockCreateInviteMutateAsync,
    isPending: false,
  }),
  useRevokeInviteLinkMutation: () => ({
    mutateAsync: mockRevokeInviteMutateAsync,
    isPending: false,
  }),
  useUpdateMemberRoleMutation: () => ({
    mutateAsync: mockUpdateRoleMutateAsync,
    isPending: false,
  }),
  useRemoveMemberMutation: () => ({
    mutateAsync: mockRemoveMemberMutateAsync,
    isPending: false,
  }),
  useTransferOwnershipMutation: () => ({
    mutateAsync: mockTransferOwnershipMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "members.title": "Quản lý thành viên",
        "members.subtitle": "Quản trị danh sách người dùng trong tổ chức",
        "members.inviteMemberTitle": "Mời thành viên",
        "members.createLinkTitle": "Tạo liên kết",
        "members.createLinkButton": "Tạo liên kết",
        "members.inviteEmailPlaceholder": "colleague@company.com",
        "members.sendInvite": "Gửi lời mời",
        "members.inviteEmailRequired": "Please enter an email address.",
        "members.inviteSentSuccess":
          'Invitation sent to {email} with role "{role}".',
        "members.roleOwner": "Owner",
        "members.roleAdmin": "Admin",
        "members.roleRecruiter": "Recruiter",
        "members.roleHiringManager": "Hiring Manager",
        "members.roleInterviewer": "Interviewer",
        "members.roleMember": "Member",
        "members.roleLabel": "Role",
        "members.updateRoleSuccess": "Member role updated successfully.",
        "members.updateRoleError": "Failed to update member role.",
        "members.transferOwnership": "Chuyển quyền sở hữu",
        "members.transferOwnershipConfirmTitle": "Chuyển giao quyền sở hữu",
        "members.transferOwnershipConfirmDesc": "Chuyển giao cho",
        "members.transferOwnershipConfirmNote": "Bạn sẽ là Admin",
        "members.transferOwnershipConfirmButton": "Chuyển giao",
        "members.transferOwnershipSuccess": "Thành công",
        "members.memberActionsTitle": "Thao tác thành viên",
        "common.cancel": "Hủy",
        "common.you": "Bạn",
      };
      let text = dict[key] || key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
  }),
}));

describe("MembersSettingsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMembersOptions = undefined;
    capturedInviteLinksOptions = undefined;
    mockAuthUser = {
      id: "user-admin",
      name: "Admin User",
      email: "admin@haihire.vn",
      role: "ADMIN",
      isOwner: true,
      organization: { id: "org-1", ownerId: "mem-owner" },
    };
    mockCanEdit = true;
    mockIsOwner = true;
    mockInviteLinks = [
      {
        id: "link-1",
        token: "tok-abc-123",
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 5,
        usesCount: 1,
      },
    ];
  });

  it("renders page title and member list correctly", () => {
    render(<MembersSettingsPage />);

    expect(screen.getByText("Quản lý thành viên")).toBeInTheDocument();
    expect(screen.getByText("Nguyen Recruiter")).toBeInTheDocument();
    expect(screen.getByText("recruiter@haihire.vn")).toBeInTheDocument();
    expect(screen.getByText("Tran Interviewer")).toBeInTheDocument();
    expect(screen.getByText("interviewer@haihire.vn")).toBeInTheDocument();
  });

  it("opens invite member section and allows sending invitation", async () => {
    render(<MembersSettingsPage />);

    // Click "Invite member" button
    const inviteBtn = screen.getByText("Mời thành viên").closest("button");
    if (inviteBtn) {
      fireEvent.click(inviteBtn);
    }

    const emailInput = screen.getByPlaceholderText("colleague@company.com");
    fireEvent.change(emailInput, { target: { value: "newbie@haihire.vn" } });

    const sendBtn = screen.getByText("Gửi lời mời").closest("button");
    if (sendBtn) {
      fireEvent.click(sendBtn);
    }

    await waitFor(
      () => {
        expect(
          screen.getByText(/Invitation sent to newbie@haihire.vn/),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("opens create invite link dialog and submits new invite link", async () => {
    mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-new" });

    render(<MembersSettingsPage />);

    // Click "+ Create link" button to reveal form
    const openCreateBtn = screen.getByRole("button", { name: /Tạo liên kết/ });
    fireEvent.click(openCreateBtn);

    // Click confirm button inside the revealed form
    const confirmCreateBtn = screen.getByRole("button", {
      name: /Tạo liên kết/,
    });
    fireEvent.click(confirmCreateBtn);

    await waitFor(() => {
      expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "MEMBER",
        }),
      );
      expect(mockRefetchLinks).toHaveBeenCalled();
    });
  });

  it("renders transfer ownership option for organization owner and executes mutation on confirm", async () => {
    mockTransferOwnershipMutateAsync.mockResolvedValueOnce({ success: true });

    render(<MembersSettingsPage />);

    // Click member action button for Nguyen Recruiter (mem-1)
    const actionButtons = screen.getAllByTitle("Thao tác thành viên");
    expect(actionButtons.length).toBeGreaterThan(0);
    fireEvent.click(actionButtons[0]);

    // Expect "Transfer Ownership" button to be visible
    const transferBtn = screen.getByText("Chuyển quyền sở hữu");
    expect(transferBtn).toBeInTheDocument();
    fireEvent.click(transferBtn);

    // Expect modal confirm button to be present and clickable
    const confirmBtn = screen.getByRole("button", { name: "Chuyển giao" });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledWith("mem-1");
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  describe("5-Role Member Role Management (RBAC)", () => {
    it("allows owner to see dropdown, select RECRUITER, and calls mutation with { role: 'RECRUITER' }", async () => {
      mockAuthUser = {
        id: "mem-owner",
        name: "Le Owner",
        email: "owner@haihire.vn",
        role: "ADMIN",
        isOwner: true,
        organization: { id: "org-1", ownerId: "mem-owner" },
      };
      mockIsOwner = true;
      mockCanEdit = true;
      mockUpdateRoleMutateAsync.mockResolvedValueOnce({
        success: true,
        message: "Member role updated to RECRUITER",
      });

      render(<MembersSettingsPage />);

      const dropdowns = screen.getAllByLabelText("Role");
      expect(dropdowns.length).toBe(4);

      // Tran Interviewer is index 3 (mem-2) with role MEMBER
      const memberDropdown = dropdowns[3];
      expect(memberDropdown).not.toBeDisabled();
      fireEvent.click(memberDropdown);

      // Find and select option "Recruiter"
      const recruiterOption = screen.getByRole("option", { name: "Recruiter" });
      expect(recruiterOption).toBeInTheDocument();
      fireEvent.click(recruiterOption);

      await waitFor(() => {
        expect(mockUpdateRoleMutateAsync).toHaveBeenCalledWith({
          memberId: "mem-2",
          role: "RECRUITER",
        });
      });
    });

    it("allows non-owner admin with org:manage_members permission to see role dropdowns", () => {
      mockAuthUser = {
        id: "user-admin",
        name: "Admin User",
        email: "admin@haihire.vn",
        role: "ADMIN",
        isOwner: false,
        organization: { id: "org-1", ownerId: "mem-owner" },
      };
      mockIsOwner = false;
      mockCanEdit = true;

      render(<MembersSettingsPage />);

      const dropdowns = screen.getAllByLabelText("Role");
      expect(dropdowns.length).toBe(4);
    });

    it("blocks access and disables queries for regular member without org:manage_members permission", () => {
      mockAuthUser = {
        id: "mem-2",
        name: "Tran Interviewer",
        email: "interviewer@haihire.vn",
        role: "MEMBER",
        isOwner: false,
        organization: { id: "org-1", ownerId: "mem-owner" },
      };
      mockIsOwner = false;
      mockCanEdit = false;

      render(<MembersSettingsPage />);

      expect(capturedMembersOptions).toEqual({ enabled: false });
      expect(capturedInviteLinksOptions).toEqual({ enabled: false });
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(
        "You do not have permission to access this section. Please contact your administrator if you need access.",
      );
      expect(screen.queryAllByLabelText("Role")).toHaveLength(0);
    });

    it("disables dropdown for self (current user) and owner", () => {
      mockAuthUser = {
        id: "user-admin",
        name: "Admin User",
        email: "admin@haihire.vn",
        role: "ADMIN",
        isOwner: false,
        organization: { id: "org-1", ownerId: "mem-owner" },
      };
      mockIsOwner = false;
      mockCanEdit = true;

      render(<MembersSettingsPage />);

      const dropdowns = screen.getAllByLabelText("Role");
      expect(dropdowns.length).toBe(4);

      // Index 0: mem-owner (Owner) -> disabled
      expect(dropdowns[0]).toBeDisabled();

      // Index 1: user-admin (Current user) -> disabled
      expect(dropdowns[1]).toBeDisabled();

      // Index 2: mem-1 (Other member) -> enabled
      expect(dropdowns[2]).not.toBeDisabled();

      // Index 3: mem-2 (Other member) -> enabled
      expect(dropdowns[3]).not.toBeDisabled();
    });

    it("preserves stable member order (owner first, then createdAt asc) regardless of role changes", () => {
      mockAuthUser = {
        id: "mem-owner",
        name: "Le Owner",
        email: "owner@haihire.vn",
        role: "ADMIN",
        isOwner: true,
        organization: { id: "org-1", ownerId: "mem-owner" },
      };
      mockIsOwner = true;
      mockCanEdit = true;

      render(<MembersSettingsPage />);

      const dropdowns = screen.getAllByLabelText("Role");
      expect(dropdowns).toHaveLength(4);

      expect(dropdowns[0]).toHaveTextContent("Admin");
      expect(dropdowns[1]).toHaveTextContent("Admin");
      expect(dropdowns[2]).toHaveTextContent("Admin");
      expect(dropdowns[3]).toHaveTextContent("Member");
    });
  });

  describe("Multi-Role Invitations", () => {
    it("displays localized role labels on active invite link rows instead of raw enum keys", () => {
      mockInviteLinks = [
        {
          id: "link-hm",
          token: "tok-hm-123",
          role: "HIRING_MANAGER",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          maxUses: 5,
          usesCount: 1,
        },
        {
          id: "link-rec",
          token: "tok-rec-456",
          role: "RECRUITER",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          maxUses: 3,
          usesCount: 0,
        },
      ];

      render(<MembersSettingsPage />);

      expect(screen.getByText("Hiring Manager")).toBeInTheDocument();
      expect(screen.getByText("Recruiter")).toBeInTheDocument();
      expect(screen.queryByText("HIRING_MANAGER")).not.toBeInTheDocument();
      expect(screen.queryByText("RECRUITER")).not.toBeInTheDocument();
    });

    it("shows all 5 roles for owner/admin in InviteMemberCard and InviteLinksCard and submits selected role", async () => {
      mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-hm" });

      render(<MembersSettingsPage />);

      // 1. Test InviteMemberCard dropdown + submit with Recruiter
      const inviteBtn = screen.getByText("Mời thành viên").closest("button");
      expect(inviteBtn).toBeTruthy();
      fireEvent.click(inviteBtn!);

      const emailInput = screen.getByPlaceholderText("colleague@company.com");
      const inviteForm = emailInput.closest("form");
      expect(inviteForm).toBeTruthy();

      const memberRoleTrigger = within(inviteForm!).getByRole("button", {
        name: "Member",
      });
      fireEvent.click(memberRoleTrigger);

      for (const expectedLabel of [
        "Admin",
        "Recruiter",
        "Hiring Manager",
        "Interviewer",
        "Member",
      ]) {
        expect(
          screen.getByRole("option", { name: expectedLabel }),
        ).toBeInTheDocument();
      }

      fireEvent.click(screen.getByRole("option", { name: "Recruiter" }));
      fireEvent.change(emailInput, { target: { value: "rec@haihire.vn" } });
      fireEvent.click(screen.getByText("Gửi lời mời").closest("button")!);

      await waitFor(
        () => {
          expect(
            screen.getByText(
              'Invitation sent to rec@haihire.vn with role "Recruiter".',
            ),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // 2. Test InviteLinksCard dropdown + submit with HIRING_MANAGER
      const openCreateBtn = screen.getByRole("button", {
        name: /Tạo liên kết/,
      });
      fireEvent.click(openCreateBtn);

      const expiresLabel = screen.getByText("members.expiresInLabel");
      const createPanel = expiresLabel.closest("div")!.parentElement!;
      const linkRoleTrigger = within(createPanel).getByRole("button", {
        name: "Member",
      });
      fireEvent.click(linkRoleTrigger);

      for (const expectedLabel of [
        "Admin",
        "Recruiter",
        "Hiring Manager",
        "Interviewer",
        "Member",
      ]) {
        expect(
          screen.getByRole("option", { name: expectedLabel }),
        ).toBeInTheDocument();
      }

      fireEvent.click(screen.getByRole("option", { name: "Hiring Manager" }));

      const confirmCreateBtn = within(createPanel).getByRole("button", {
        name: /Tạo liên kết/,
      });
      fireEvent.click(confirmCreateBtn);

      await waitFor(() => {
        expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            role: "HIRING_MANAGER",
          }),
        );
      });
    });

    it("excludes ADMIN option in invite cards for non-owner non-admin users granted org:manage_members", () => {
      mockAuthUser = {
        id: "user-recruiter",
        name: "Recruiter User",
        email: "recruiter@haihire.vn",
        role: "RECRUITER",
        isOwner: false,
        organization: { id: "org-1", ownerId: "mem-owner" },
      };
      mockIsOwner = false;
      mockCanEdit = true;

      const myPermsSpy = vi
        .spyOn(OrgQueriesModule, "useMyPermissions")
        .mockReturnValue({
          data: { permissions: ["org:manage_members"] },
        } as ReturnType<typeof OrgQueriesModule.useMyPermissions>);

      try {
        render(<MembersSettingsPage />);

        const inviteBtn = screen.getByText("Mời thành viên").closest("button");
        fireEvent.click(inviteBtn!);
        const emailInput = screen.getByPlaceholderText("colleague@company.com");
        const inviteForm = emailInput.closest("form")!;
        const inviteTrigger = within(inviteForm).getByRole("button", {
          name: "Member",
        });
        fireEvent.click(inviteTrigger);

        expect(
          screen.queryByRole("option", { name: "Admin" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Recruiter" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Hiring Manager" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Interviewer" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Member" }),
        ).toBeInTheDocument();

        // Close InviteMemberCard listbox before opening InviteLinksCard listbox
        fireEvent.click(screen.getByRole("option", { name: "Recruiter" }));

        const openCreateBtn = screen.getByRole("button", {
          name: /Tạo liên kết/,
        });
        fireEvent.click(openCreateBtn);
        const expiresLabel = screen.getByText("members.expiresInLabel");
        const createPanel = expiresLabel.closest("div")!.parentElement!;
        const linkRoleTrigger = within(createPanel).getByRole("button", {
          name: "Member",
        });
        fireEvent.click(linkRoleTrigger);

        expect(
          screen.queryByRole("option", { name: "Admin" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Hiring Manager" }),
        ).toBeInTheDocument();
      } finally {
        myPermsSpy.mockRestore();
      }
    });
  });
});
