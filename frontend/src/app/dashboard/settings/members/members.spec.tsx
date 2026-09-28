import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MembersSettingsPage from "./page";

const mockCreateInviteMutateAsync = vi.fn();
const mockRevokeInviteMutateAsync = vi.fn();
const mockUpdateRoleMutateAsync = vi.fn();
const mockRemoveMemberMutateAsync = vi.fn();
const mockRefetchLinks = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-admin", name: "Admin User", email: "admin@haihire.vn", role: "ADMIN" },
    canEdit: true,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useOrgMembers: () => ({
    data: [
      { id: "mem-1", name: "Nguyen Recruiter", email: "recruiter@haihire.vn", role: "ADMIN" },
      { id: "mem-2", name: "Tran Interviewer", email: "interviewer@haihire.vn", role: "MEMBER" },
    ],
    isLoading: false,
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
        "members.roleMember": "Member",
        "members.roleAdmin": "Admin",
        "common.cancel": "Hủy",
      };
      return dict[key] || key;
    },
  }),
}));

describe("MembersSettingsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // Click "Mời thành viên" button
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
          screen.getByText(/Invitation sent to newbie@haihire.vn/)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("opens create invite link dialog and submits new invite link", async () => {
    mockCreateInviteMutateAsync.mockResolvedValueOnce({ id: "link-new" });

    render(<MembersSettingsPage />);

    // Click "+ Tạo liên kết" button to reveal form
    const openCreateBtn = screen.getByRole("button", { name: /Tạo liên kết/ });
    fireEvent.click(openCreateBtn);

    // Click confirm button inside the revealed form
    const confirmCreateBtn = screen.getByRole("button", { name: /Tạo liên kết/ });
    fireEvent.click(confirmCreateBtn);

    await waitFor(() => {
      expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "MEMBER",
        })
      );
      expect(mockRefetchLinks).toHaveBeenCalled();
    });
  });
});
