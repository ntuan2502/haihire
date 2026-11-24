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
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCreateInviteMutateAsync = vi.fn();
const mockResendInviteMutateAsync = vi.fn();
const mockRevokeInviteMutateAsync = vi.fn();
const mockUpdateRoleMutateAsync = vi.fn();
const mockRemoveMemberMutateAsync = vi.fn();
const mockTransferOwnershipMutateAsync = vi.fn();
const mockRefetchLinks = vi.fn();
const mockRefreshUser = vi.fn();
let mockLinkUsagesList: Array<{
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  usedAt: string;
}> = [];

let mockAuthUser = {
  id: "user-admin",
  firstName: "Admin",
  lastName: "User",
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
let capturedInviteLinksOptions:
  { enabled?: boolean; includeRevoked?: boolean } | undefined;

vi.mock("@/hooks/use-queries", () => ({
  useOrgMembers: (options?: { enabled?: boolean }) => {
    capturedMembersOptions = options;
    return {
      data: mockMembersList,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
  useInviteLinks: (options?: {
    enabled?: boolean;
    includeRevoked?: boolean;
  }) => {
    capturedInviteLinksOptions = options;
    return {
      data: mockInviteLinks,
      refetch: mockRefetchLinks,
    };
  },
  useInviteLinkUsages: () => ({
    data: mockLinkUsagesList,
    isLoading: false,
  }),
  useCreateInviteLinkMutation: () => ({
    mutateAsync: mockCreateInviteMutateAsync,
    isPending: false,
  }),
  useResendInviteLinkMutation: () => ({
    mutateAsync: mockResendInviteMutateAsync,
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
        "members.usesCount": "{used}/{max} lượt dùng",
        "members.expiresInDays": "Hết hạn sau {days} ngày",
        "members.noExpiration": "Không giới hạn thời gian",
        "members.linkExpired": "Đã hết hạn",
        "members.linkLimitReached": "Đã hết lượt dùng",
        "members.linkCreatedOn": "Tạo ngày {date}",
        "members.createLinkSuccess": "Đã tạo liên kết mời thành công.",
        "members.revokeLinkSuccess": "Đã thu hồi liên kết mời thành công.",
        "members.removeMemberSuccess": "Đã xóa thành viên khỏi tổ chức.",
        "members.searchPlaceholder": "Tìm theo tên hoặc email...",
        "members.allRoles": "Tất cả vai trò",
        "members.filterByRole": "Lọc theo vai trò",
        "members.noMatchingMembers": "Không tìm thấy thành viên phù hợp.",
        "members.joinedOn": "Tham gia {date}",
        "members.tabMembers": "Thành viên",
        "members.tabEmailInvites": "Lời mời qua Email",
        "members.tabShareableLinks": "Liên kết chia sẻ",
        "members.statusPending": "Đang chờ",
        "members.statusAccepted": "Đã chấp nhận",
        "members.statusRevoked": "Đã thu hồi",
        "members.allActiveStatuses": "Hiệu lực & đã nhận",
        "members.allStatuses": "Tất cả trạng thái",
        "members.resendInvite": "Gửi lại",
        "members.resendInviteSuccess": "Đã gửi lại lời mời đến {email}.",
        "members.acceptedByOn": "Được {name} chấp nhận lúc {date}",
        "members.invitedByLabel": "Mời bởi {name}",
        "members.emailInvitesTitle": "Danh sách lời mời qua email",
        "members.emailInvitesSubtitle":
          "Theo dõi các lời mời định danh qua email.",
        "members.noEmailInvites": "Chưa có lời mời qua email nào",
        "members.noEmailInvitesDesc": "Gửi lời mời trực tiếp qua email.",
        "members.noMatchingInvites": "Không có lời mời nào khớp bộ lọc này.",
        "members.viewUsageHistory": "{count} người đã tham gia",
        "members.usageHistoryTitle": "Lịch sử sử dụng liên kết mời",
        "members.usageHistorySubtitle": "Các tài khoản đã tham gia tổ chức.",
        "members.noLinkUsages":
          "Chưa có tài khoản nào sử dụng liên kết mời này.",
        "members.joinedAtLabel": "Tham gia lúc {date}",
        "common.active": "Đang hoạt động",
        "common.clearSearch": "Xóa tìm kiếm",
        "common.created": "Ngày tạo",
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
    mockLinkUsagesList = [];
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
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringMatching(/Invitation sent to newbie@haihire.vn/),
        );
      },
      { timeout: 2000 },
    );
  });

  it("opens create invite link dialog and submits new invite link", async () => {
    mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-new" });

    render(<MembersSettingsPage />);

    // Open Shareable Links tab
    fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

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
    fireEvent.pointerDown(actionButtons[0], { button: 0, ctrlKey: false });
    fireEvent.click(actionButtons[0]);

    // Expect "Transfer Ownership" menuitem to be visible
    const transferBtn = await screen.findByRole("menuitem", {
      name: "Chuyển quyền sở hữu",
    });
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
      expect(capturedInviteLinksOptions).toEqual({
        enabled: false,
        includeRevoked: true,
      });
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

      fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

      expect(screen.getByText("Hiring Manager")).toBeInTheDocument();
      expect(screen.getByText("Recruiter")).toBeInTheDocument();
      expect(screen.queryByText("HIRING_MANAGER")).not.toBeInTheDocument();
      expect(screen.queryByText("RECRUITER")).not.toBeInTheDocument();
    });

    it("shows all 5 roles for owner/admin in InviteMemberCard and InviteLinksCard and submits selected role", async () => {
      mockCreateInviteMutateAsync.mockResolvedValue({ id: "link-hm" });

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
          expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
              email: "rec@haihire.vn",
              role: "RECRUITER",
            }),
          );
          expect(toast.success).toHaveBeenCalledWith(
            'Invitation sent to rec@haihire.vn with role "Recruiter".',
          );
        },
        { timeout: 2000 },
      );

      // 2. Test InviteLinksCard dropdown + submit with HIRING_MANAGER
      fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

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

        fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

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

    it("locks ADMIN target role dropdowns and action menus for non-admin/non-owner users with org:manage_members", () => {
      mockAuthUser = {
        id: "user-recruiter",
        firstName: "Recruiter",
        lastName: "User",
        name: "Recruiter User",
        email: "recruiter2@haihire.vn",
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

        const dropdowns = screen.getAllByLabelText("Role");
        expect(dropdowns).toHaveLength(4);

        // mem-owner (Owner) -> disabled
        expect(dropdowns[0]).toBeDisabled();
        // user-admin (ADMIN target) -> disabled for RECRUITER caller, still shows Admin label
        expect(dropdowns[1]).toBeDisabled();
        expect(dropdowns[1]).toHaveTextContent("Admin");
        // mem-1 (ADMIN target) -> disabled for RECRUITER caller
        expect(dropdowns[2]).toBeDisabled();
        expect(dropdowns[2]).toHaveTextContent("Admin");
        // mem-2 (MEMBER target) -> enabled, and ADMIN option excluded when opened
        expect(dropdowns[3]).not.toBeDisabled();
        fireEvent.click(dropdowns[3]);
        expect(
          screen.queryByRole("option", { name: "Admin" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Recruiter" }),
        ).toBeInTheDocument();

        // Only mem-2 (non-ADMIN, non-owner, non-self) should expose an action menu button
        const actionButtons = screen.getAllByTitle("Thao tác thành viên");
        expect(actionButtons).toHaveLength(1);
      } finally {
        myPermsSpy.mockRestore();
      }
    });
  });

  describe("Invite Links Display, Toasts, and Member Filtering", () => {
    it("displays localized uses label, expiry, created date, and distinct status badges while hiding Copy on inactive links", () => {
      mockInviteLinks = [
        {
          id: "link-active",
          token: "tok-active",
          role: "MEMBER",
          status: "ACTIVE",
          expiresAt: null,
          maxUses: null,
          usesCount: 2,
          createdAt: "2026-01-10T00:00:00Z",
        } as never,
        {
          id: "link-expired-date",
          token: "tok-expired",
          role: "RECRUITER",
          status: "ACTIVE",
          expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
          maxUses: 5,
          usesCount: 1,
          createdAt: "2026-01-05T00:00:00Z",
        } as never,
        {
          id: "link-full-uses",
          token: "tok-full",
          role: "INTERVIEWER",
          status: "EXPIRED",
          expiresAt: new Date(Date.now() + 86_400_000 * 3).toISOString(),
          maxUses: 1,
          usesCount: 1,
          createdAt: "2026-01-06T00:00:00Z",
        } as never,
      ];

      render(<MembersSettingsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

      expect(screen.getByText("Đang hoạt động")).toBeInTheDocument();
      expect(screen.getByText("Đã hết hạn")).toBeInTheDocument();
      expect(screen.getByText("Đã hết lượt dùng")).toBeInTheDocument();

      expect(screen.getByText(/2\/∞ lượt dùng/)).toBeInTheDocument();
      expect(screen.getByText(/Không giới hạn thời gian/)).toBeInTheDocument();
      expect(screen.getByText(/1\/5 lượt dùng/)).toBeInTheDocument();
      expect(screen.getByText(/1\/1 lượt dùng/)).toBeInTheDocument();

      // Copy link is only shown for the 1 active link (not expired-by-date or full-uses links)
      const copyButtons = screen.getAllByText("members.copyLink");
      expect(copyButtons).toHaveLength(1);
    });

    it("fires toast.success once on create link and toast.error exactly once on create failure", async () => {
      mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-ok" });
      mockCreateInviteMutateAsync.mockRejectedValueOnce(
        new Error("Invite creation failed"),
      );

      render(<MembersSettingsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

      // First submit succeeds
      fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));
      fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Đã tạo liên kết mời thành công.",
        );
      });

      // Re-open form and trigger error
      fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));
      fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledTimes(1);
      });
    });

    it("filters members by search query and role and shows empty state plus join dates", () => {
      render(<MembersSettingsPage />);

      // Join date rendered from createdAt (DEFAULT_ORG_LOCALIZATION uses DD/MM/YYYY)
      expect(screen.getByText(/Tham gia 04\/01\/2026/)).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(
        "Tìm theo tên hoặc email...",
      );
      fireEvent.change(searchInput, { target: { value: "interviewer" } });

      expect(screen.getByText("Tran Interviewer")).toBeInTheDocument();
      expect(screen.queryByText("Nguyen Recruiter")).not.toBeInTheDocument();

      // Search with no results shows empty filter message
      fireEvent.change(searchInput, { target: { value: "does-not-exist" } });
      expect(
        screen.getByText("Không tìm thấy thành viên phù hợp."),
      ).toBeInTheDocument();

      // Clear search restores members, then filter by role
      fireEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));
      expect(screen.getByText("Nguyen Recruiter")).toBeInTheDocument();

      const roleFilterBtn = screen.getByLabelText("Lọc theo vai trò");
      fireEvent.click(roleFilterBtn);
      fireEvent.click(screen.getByRole("option", { name: "Member" }));

      expect(screen.getByText("Tran Interviewer")).toBeInTheDocument();
      expect(screen.queryByText("Nguyen Recruiter")).not.toBeInTheDocument();
    });
  });

  describe("3-Tab Invitations Tracking & Usage History Drawer", () => {
    it("displays email invitations tab with pending/accepted/expired statuses, accepter attribution, revoked filter, and resend action", async () => {
      mockResendInviteMutateAsync.mockResolvedValueOnce({
        id: "inv-resent",
        invitedEmail: "pending@haihire.vn",
      });

      mockInviteLinks = [
        {
          id: "email-pending",
          token: "tok-p",
          role: "RECRUITER",
          inviteType: "EMAIL",
          invitedEmail: "pending@haihire.vn",
          status: "ACTIVE",
          derivedStatus: "PENDING",
          expiresAt: new Date(Date.now() + 86_400_000 * 5).toISOString(),
          maxUses: 1,
          usesCount: 0,
          createdByName: "Le Owner",
          recentUsages: [],
          createdAt: "2026-01-10T08:00:00Z",
        } as never,
        {
          id: "email-accepted",
          token: "tok-a",
          role: "HIRING_MANAGER",
          inviteType: "EMAIL",
          invitedEmail: "accepted@haihire.vn",
          status: "EXPIRED",
          derivedStatus: "ACCEPTED",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          maxUses: 1,
          usesCount: 1,
          createdByName: "Le Owner",
          recentUsages: [
            {
              id: "use-1",
              userId: "u-acc",
              userName: "Nguyen An",
              userEmail: "accepted@haihire.vn",
              userAvatarUrl: null,
              usedAt: "2026-01-11T09:30:00Z",
            },
          ],
          createdAt: "2026-01-09T08:00:00Z",
        } as never,
        {
          id: "email-revoked",
          token: "tok-r",
          role: "MEMBER",
          inviteType: "EMAIL",
          invitedEmail: "revoked@haihire.vn",
          status: "REVOKED",
          derivedStatus: "REVOKED",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          maxUses: 1,
          usesCount: 0,
          createdByName: "Le Owner",
          recentUsages: [],
          createdAt: "2026-01-08T08:00:00Z",
        } as never,
      ];

      render(<MembersSettingsPage />);

      // Switch to Email Invitations tab
      fireEvent.click(screen.getByRole("tab", { name: /Lời mời qua Email/ }));

      expect(screen.getByText("pending@haihire.vn")).toBeInTheDocument();
      expect(screen.getByText("accepted@haihire.vn")).toBeInTheDocument();
      // Accepter name and timestamp shown for ACCEPTED invitation
      expect(
        screen.getByText(/Được Nguyen An chấp nhận lúc 11\/01\/2026/),
      ).toBeInTheDocument();
      // Revoked hidden by default filter
      expect(screen.queryByText("revoked@haihire.vn")).not.toBeInTheDocument();

      // Resend action on Pending invite
      fireEvent.click(screen.getByRole("button", { name: "Gửi lại" }));
      await waitFor(() => {
        expect(mockResendInviteMutateAsync).toHaveBeenCalledWith(
          "email-pending",
        );
        expect(toast.success).toHaveBeenCalledWith(
          "Đã gửi lại lời mời đến pending@haihire.vn.",
        );
      });

      // Switch filter to Revoked reveals revoked row
      fireEvent.click(screen.getByRole("button", { name: "Đã thu hồi" }));
      expect(screen.getByText("revoked@haihire.vn")).toBeInTheDocument();
      expect(screen.queryByText("pending@haihire.vn")).not.toBeInTheDocument();
    });

    it("opens invite link usage drawer showing users and join timestamps when clicking usage badge", async () => {
      mockLinkUsagesList = [
        {
          id: "usage-1",
          userId: "u-joined-1",
          userName: "Tran Minh",
          userEmail: "minh@haihire.vn",
          userAvatarUrl: null,
          usedAt: "2026-01-12T10:15:00Z",
        },
        {
          id: "usage-2",
          userId: "u-joined-2",
          userName: "Le Hoa",
          userEmail: "hoa@haihire.vn",
          userAvatarUrl: null,
          usedAt: "2026-01-12T11:45:00Z",
        },
      ];

      mockInviteLinks = [
        {
          id: "link-shared",
          token: "tok-shared",
          role: "MEMBER",
          inviteType: "LINK",
          invitedEmail: null,
          status: "ACTIVE",
          derivedStatus: "ACTIVE",
          expiresAt: null,
          maxUses: 10,
          usesCount: 2,
          createdByName: "Le Owner",
          recentUsages: mockLinkUsagesList,
          createdAt: "2026-01-10T08:00:00Z",
        } as never,
      ];

      render(<MembersSettingsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /Liên kết chia sẻ/ }));

      const historyBtn = screen.getByRole("button", {
        name: /2 người đã tham gia/,
      });
      fireEvent.click(historyBtn);

      expect(
        await screen.findByText("Lịch sử sử dụng liên kết mời"),
      ).toBeInTheDocument();
      expect(screen.getByText("Tran Minh")).toBeInTheDocument();
      expect(screen.getByText("minh@haihire.vn")).toBeInTheDocument();
      expect(screen.getByText("Le Hoa")).toBeInTheDocument();
      expect(screen.getAllByText(/Tham gia lúc 12\/01\/2026/)).toHaveLength(2);
    });
  });
});
