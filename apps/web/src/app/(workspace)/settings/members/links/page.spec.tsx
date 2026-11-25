import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import MemberInviteLinksPage from "./page";
import * as OrgQueriesModule from "@/hooks/use-organization-queries";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCreateInviteMutateAsync = vi.fn();
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
let mockLinkUsagesList: Array<{
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  usedAt: string;
}> = [];

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
  useInviteLinkUsages: () => ({
    data: mockLinkUsagesList,
    isLoading: false,
  }),
  useCreateInviteLinkMutation: () => ({
    mutateAsync: mockCreateInviteMutateAsync,
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
        "members.createLinkTitle": "Tạo liên kết",
        "members.createLinkButton": "Tạo liên kết",
        "members.roleAdmin": "Admin",
        "members.roleRecruiter": "Recruiter",
        "members.roleHiringManager": "Hiring Manager",
        "members.roleInterviewer": "Interviewer",
        "members.roleMember": "Member",
        "members.usesCount": "{used}/{max} lượt dùng",
        "members.expiresInDays": "Hết hạn sau {days} ngày",
        "members.noExpiration": "Không giới hạn thời gian",
        "members.linkExpired": "Đã hết hạn",
        "members.linkLimitReached": "Đã hết lượt dùng",
        "members.linkCreatedOn": "Tạo ngày {date}",
        "members.createLinkSuccess": "Đã tạo liên kết mời thành công.",
        "members.revokeLinkSuccess": "Đã thu hồi liên kết mời thành công.",
        "members.viewUsageHistory": "{count} người đã tham gia",
        "members.usageHistoryTitle": "Lịch sử sử dụng liên kết mời",
        "members.usageHistorySubtitle": "Các tài khoản đã tham gia tổ chức.",
        "members.noLinkUsages":
          "Chưa có tài khoản nào sử dụng liên kết mời này.",
        "members.joinedAtLabel": "Tham gia lúc {date}",
        "common.active": "Đang hoạt động",
        "common.cancel": "Hủy",
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

describe("MemberInviteLinksPage (/settings/members/links)", () => {
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
    mockLinkUsagesList = [];
    mockInviteLinks = [
      {
        id: "link-1",
        token: "tok-abc-123",
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        maxUses: 5,
        usesCount: 1,
      },
    ];
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

    render(<MemberInviteLinksPage />);

    expect(capturedInviteLinksOptions).toEqual({
      enabled: false,
      includeRevoked: true,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have permission to access this section. Please contact your administrator if you need access.",
    );
  });

  it("opens create invite link form and submits new invite link", async () => {
    mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-new" });

    render(<MemberInviteLinksPage />);

    fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));

    await waitFor(() => {
      expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: "MEMBER" }),
      );
      expect(mockRefetchLinks).toHaveBeenCalled();
    });
  });

  it("displays localized role labels on active invite link rows instead of raw enum keys", () => {
    mockInviteLinks = [
      {
        id: "link-hm",
        token: "tok-hm-123",
        role: "HIRING_MANAGER",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        maxUses: 5,
        usesCount: 1,
      },
      {
        id: "link-rec",
        token: "tok-rec-456",
        role: "RECRUITER",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        maxUses: 3,
        usesCount: 0,
      },
    ];

    render(<MemberInviteLinksPage />);

    expect(screen.getByText("Hiring Manager")).toBeInTheDocument();
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
    expect(screen.queryByText("HIRING_MANAGER")).not.toBeInTheDocument();
    expect(screen.queryByText("RECRUITER")).not.toBeInTheDocument();
  });

  it("excludes ADMIN option in InviteLinksCard for non-owner non-admin users granted org:manage_members", () => {
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
      render(<MemberInviteLinksPage />);

      fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));
      const expiresLabel = screen.getByText("members.expiresInLabel");
      const createPanel = expiresLabel.closest("div")!.parentElement!;
      fireEvent.click(
        within(createPanel).getByRole("button", { name: "Member" }),
      );

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

  it("displays localized uses label, expiry, status badges, and hides Copy on inactive links", () => {
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
      },
      {
        id: "link-expired-date",
        token: "tok-expired",
        role: "RECRUITER",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
        maxUses: 5,
        usesCount: 1,
        createdAt: "2026-01-05T00:00:00Z",
      },
      {
        id: "link-full-uses",
        token: "tok-full",
        role: "INTERVIEWER",
        status: "EXPIRED",
        expiresAt: new Date(Date.now() + 86_400_000 * 3).toISOString(),
        maxUses: 1,
        usesCount: 1,
        createdAt: "2026-01-06T00:00:00Z",
      },
    ];

    render(<MemberInviteLinksPage />);

    expect(screen.getByText("Đang hoạt động")).toBeInTheDocument();
    expect(screen.getByText("Đã hết hạn")).toBeInTheDocument();
    expect(screen.getByText("Đã hết lượt dùng")).toBeInTheDocument();
    expect(screen.getByText(/2\/∞ lượt dùng/)).toBeInTheDocument();
    expect(screen.getByText(/Không giới hạn thời gian/)).toBeInTheDocument();
    expect(screen.getByText(/1\/5 lượt dùng/)).toBeInTheDocument();
    expect(screen.getByText(/1\/1 lượt dùng/)).toBeInTheDocument();
    expect(screen.getAllByText("members.copyLink")).toHaveLength(1);
  });

  it("fires toast.success once on create link and toast.error once on create failure", async () => {
    mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-ok" });
    mockCreateInviteMutateAsync.mockRejectedValueOnce(
      new Error("Invite creation failed"),
    );

    render(<MemberInviteLinksPage />);

    fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Đã tạo liên kết mời thành công.",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tạo liên kết/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
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
      },
    ];

    render(<MemberInviteLinksPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /2 người đã tham gia/ }),
    );

    expect(
      await screen.findByText("Lịch sử sử dụng liên kết mời"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tran Minh")).toBeInTheDocument();
    expect(screen.getByText("minh@haihire.vn")).toBeInTheDocument();
    expect(screen.getByText("Le Hoa")).toBeInTheDocument();
    expect(screen.getAllByText(/Tham gia lúc 12\/01\/2026/)).toHaveLength(2);
  });
});
