import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MembersSettingsPage from "./page";

const mockCreateInviteMutateAsync = vi.fn();
const mockRevokeInviteMutateAsync = vi.fn();
const mockUpdateRoleMutateAsync = vi.fn();
const mockRemoveMemberMutateAsync = vi.fn();
const mockTransferOwnershipMutateAsync = vi.fn();
const mockRefetchLinks = vi.fn();

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

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    canEdit: mockCanEdit,
    isOwner: mockIsOwner,
  }),
}));

const mockMembersList = [
  {
    id: "mem-owner",
    name: "Le Owner",
    email: "owner@haihire.vn",
    role: "ADMIN",
    isOwner: true,
  },
  {
    id: "user-admin",
    name: "Admin User",
    email: "admin@haihire.vn",
    role: "ADMIN",
    isOwner: false,
  },
  {
    id: "mem-1",
    name: "Nguyen Recruiter",
    email: "recruiter@haihire.vn",
    role: "ADMIN",
    isOwner: false,
  },
  {
    id: "mem-2",
    name: "Tran Interviewer",
    email: "interviewer@haihire.vn",
    role: "MEMBER",
    isOwner: false,
  },
];

vi.mock("@/hooks/use-queries", () => ({
  useOrgMembers: () => ({
    data: mockMembersList,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useInviteLinks: () => ({
    data: [
      {
        id: "link-1",
        token: "tok-abc-123",
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 5,
        uses: 1,
      },
    ],
    refetch: mockRefetchLinks,
  }),
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
    t: (key: string) => {
      const dict: Record<string, string> = {
        "members.title": "Quản lý thành viên",
        "members.subtitle": "Quản trị danh sách người dùng trong tổ chức",
        "members.inviteMemberTitle": "Mời thành viên",
        "members.createLinkTitle": "Tạo liên kết",
        "members.createLinkButton": "Tạo liên kết",
        "members.inviteEmailPlaceholder": "colleague@company.com",
        "members.sendInvite": "Gửi lời mời",
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
        "common.cancel": "Hủy",
        "common.you": "Bạn",
      };
      return dict[key] || key;
    },
  }),
}));

describe("MembersSettingsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const actionButtons = screen.getAllByTitle("Member actions");
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

    it("hides role dropdown for regular member without org:manage_members permission", () => {
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
  });
});
