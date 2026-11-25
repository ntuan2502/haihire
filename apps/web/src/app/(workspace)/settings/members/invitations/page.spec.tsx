import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import MemberInvitationsPage from "./page";
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
let mockInviteLinks: Array<Record<string, unknown>> = [];

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    canEdit: mockCanEdit,
    isOwner: mockIsOwner,
  }),
}));

let capturedInviteLinksOptions:
  { enabled?: boolean; includeRevoked?: boolean } | undefined;

vi.mock("@/hooks/use-queries", () => ({
  useInviteLinks: (options?: {
    enabled?: boolean;
    includeRevoked?: boolean;
  }) => {
    capturedInviteLinksOptions = options;
    return {
      data: mockInviteLinks,
      isLoading: false,
      refetch: mockRefetchLinks,
    };
  },
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
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "members.inviteMemberTitle": "Mời thành viên",
        "members.inviteEmailPlaceholder": "name@example.com",
        "members.sendInvite": "Gửi lời mời",
        "members.inviteEmailRequired": "Please enter an email address.",
        "members.inviteSentSuccess":
          'Invitation sent to {email} with role "{role}".',
        "members.roleAdmin": "Admin",
        "members.roleRecruiter": "Recruiter",
        "members.roleHiringManager": "Hiring Manager",
        "members.roleInterviewer": "Interviewer",
        "members.roleMember": "Member",
        "members.statusPending": "Đang chờ",
        "members.statusAccepted": "Đã chấp nhận",
        "members.statusRevoked": "Đã thu hồi",
        "members.linkExpired": "Đã hết hạn",
        "members.allActiveStatuses": "Hiệu lực & đã nhận",
        "members.allStatuses": "Tất cả trạng thái",
        "members.resendInvite": "Gửi lại",
        "members.resendInviteSuccess": "Đã gửi lại lời mời đến {email}.",
        "members.revokeLink": "Thu hồi",
        "members.revokeLinkConfirmTitle": "Thu hồi lời mời",
        "members.revokeLinkConfirmWarning": "Lời mời sẽ không thể sử dụng nữa.",
        "members.revokeLinkSuccess": "Đã thu hồi liên kết mời thành công.",
        "common.revokeConfirmWord": "REVOKE",
        "common.cancel": "Hủy",
        "members.acceptedByOn": "Được {name} chấp nhận lúc {date}",
        "members.invitedByLabel": "Mời bởi {name}",
        "members.emailInvitesTitle": "Danh sách lời mời qua email",
        "members.emailInvitesSubtitle":
          "Theo dõi các lời mời định danh qua email.",
        "members.noEmailInvites": "Chưa có lời mời qua email nào",
        "members.noEmailInvitesDesc": "Gửi lời mời trực tiếp qua email.",
        "members.noMatchingInvites": "Không có lời mời nào khớp bộ lọc này.",
        "members.expiresInDays": "Hết hạn sau {days} ngày",
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

describe("MemberInvitationsPage (/settings/members/invitations)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockInviteLinks = [];
  });

  it("blocks access and disables query when lacking org:manage_members", () => {
    mockAuthUser = {
      id: "mem-2",
      name: "Member",
      email: "member@haihire.vn",
      role: "MEMBER",
      isOwner: false,
      organization: { id: "org-1", ownerId: "mem-owner" },
    };
    mockIsOwner = false;
    mockCanEdit = false;

    render(<MemberInvitationsPage />);

    expect(capturedInviteLinksOptions).toEqual({
      enabled: false,
      includeRevoked: true,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have permission to access this section. Please contact your administrator if you need access.",
    );
  });

  it("opens invite member form from EmailInvitesCard button and submits selected role", async () => {
    mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-hm" });

    render(<MemberInvitationsPage />);

    const inviteBtn = screen.getByRole("button", { name: "Mời thành viên" });
    fireEvent.click(inviteBtn);

    const emailInput = screen.getByPlaceholderText("name@example.com");
    const inviteForm = emailInput.closest("form")!;

    const memberRoleTrigger = within(inviteForm).getByRole("button", {
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
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));

    await waitFor(() => {
      expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "rec@haihire.vn",
          role: "RECRUITER",
          maxUses: "1",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith(
        'Invitation sent to rec@haihire.vn with role "Recruiter".',
      );
      expect(mockRefetchLinks).toHaveBeenCalled();
    });
  });

  it("excludes ADMIN option in InviteMemberCard for non-owner non-admin users granted org:manage_members", () => {
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
      render(<MemberInvitationsPage />);

      fireEvent.click(screen.getByRole("button", { name: "Mời thành viên" }));
      const emailInput = screen.getByPlaceholderText("name@example.com");
      const inviteForm = emailInput.closest("form")!;
      fireEvent.click(
        within(inviteForm).getByRole("button", { name: "Member" }),
      );

      expect(
        screen.queryByRole("option", { name: "Admin" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Recruiter" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Hiring Manager" }),
      ).toBeInTheDocument();
    } finally {
      myPermsSpy.mockRestore();
    }
  });

  it("displays pending/accepted/revoked email invites, accepter attribution, status filter, and resend/revoke actions", async () => {
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
      },
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
      },
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
      },
    ];

    render(<MemberInvitationsPage />);

    expect(screen.getByText("pending@haihire.vn")).toBeInTheDocument();
    expect(screen.getByText("accepted@haihire.vn")).toBeInTheDocument();
    expect(
      screen.getByText(/Được Nguyen An chấp nhận lúc 11\/01\/2026/),
    ).toBeInTheDocument();
    expect(screen.queryByText("revoked@haihire.vn")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gửi lại" }));
    await waitFor(() => {
      expect(mockResendInviteMutateAsync).toHaveBeenCalledWith("email-pending");
      expect(toast.success).toHaveBeenCalledWith(
        "Đã gửi lại lời mời đến pending@haihire.vn.",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Đã thu hồi" }));
    expect(screen.getByText("revoked@haihire.vn")).toBeInTheDocument();
    expect(screen.queryByText("pending@haihire.vn")).not.toBeInTheDocument();
  });

  it("revokes a pending email invite via RevokeLinkModal confirmation", async () => {
    mockRevokeInviteMutateAsync.mockResolvedValueOnce({ success: true });
    mockInviteLinks = [
      {
        id: "email-pending",
        token: "tok-p",
        role: "MEMBER",
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
      },
    ];

    render(<MemberInvitationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Thu hồi" }));

    const dialog = await screen.findByRole("dialog");
    const confirmInput = within(dialog).getByRole("textbox");
    fireEvent.change(confirmInput, { target: { value: "REVOKE" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Thu hồi" }));

    await waitFor(() => {
      expect(mockRevokeInviteMutateAsync).toHaveBeenCalledWith("email-pending");
      expect(toast.success).toHaveBeenCalledWith(
        "Đã thu hồi liên kết mời thành công.",
      );
      expect(mockRefetchLinks).toHaveBeenCalled();
    });
  });
});
