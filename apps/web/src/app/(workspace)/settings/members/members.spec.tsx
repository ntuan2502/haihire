import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MembersSettingsPage from "./page";
import * as OrgQueriesModule from "@/hooks/use-organization-queries";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUpdateRoleMutateAsync = vi.fn();
const mockRemoveMemberMutateAsync = vi.fn();
const mockTransferOwnershipMutateAsync = vi.fn();
const mockRefreshUser = vi.fn();
const mockRefetchMembers = vi.fn();

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

vi.mock("@/hooks/use-queries", () => ({
  useOrgMembers: (options?: { enabled?: boolean }) => {
    capturedMembersOptions = options;
    return {
      data: mockMembersList,
      isLoading: false,
      refetch: mockRefetchMembers,
    };
  },
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
        "members.removeMemberSuccess": "Đã xóa thành viên khỏi tổ chức.",
        "members.memberActionsTitle": "Thao tác thành viên",
        "members.searchPlaceholder": "Tìm theo tên hoặc email...",
        "members.allRoles": "Tất cả vai trò",
        "members.filterByRole": "Lọc theo vai trò",
        "members.noMatchingMembers": "Không tìm thấy thành viên phù hợp.",
        "members.joinedOn": "Tham gia {date}",
        "common.clearSearch": "Xóa tìm kiếm",
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

describe("MembersSettingsPage (/settings/members)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMembersOptions = undefined;
    mockAuthUser = {
      id: "user-admin",
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      email: "admin@haihire.vn",
      role: "ADMIN",
      isOwner: true,
      organization: { id: "org-1", ownerId: "mem-owner" },
    };
    mockCanEdit = true;
    mockIsOwner = true;
  });

  it("renders member list correctly", () => {
    render(<MembersSettingsPage />);

    expect(screen.getByText("Nguyen Recruiter")).toBeInTheDocument();
    expect(screen.getByText("recruiter@haihire.vn")).toBeInTheDocument();
    expect(screen.getByText("Tran Interviewer")).toBeInTheDocument();
    expect(screen.getByText("interviewer@haihire.vn")).toBeInTheDocument();
  });

  it("renders transfer ownership option for organization owner and executes mutation on confirm", async () => {
    mockTransferOwnershipMutateAsync.mockResolvedValueOnce({ success: true });

    render(<MembersSettingsPage />);

    const actionButtons = screen.getAllByTitle("Thao tác thành viên");
    expect(actionButtons.length).toBeGreaterThan(0);
    fireEvent.pointerDown(actionButtons[0], { button: 0, ctrlKey: false });
    fireEvent.click(actionButtons[0]);

    const transferBtn = await screen.findByRole("menuitem", {
      name: "Chuyển quyền sở hữu",
    });
    expect(transferBtn).toBeInTheDocument();
    fireEvent.click(transferBtn);

    const confirmBtn = screen.getByRole("button", { name: "Chuyển giao" });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledWith("mem-1");
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Thành công");
    });
  });

  describe("5-Role Member Role Management (RBAC)", () => {
    it("allows owner to see dropdown, select RECRUITER, and calls mutation with { role: 'RECRUITER' }", async () => {
      mockAuthUser = {
        id: "mem-owner",
        firstName: "Le",
        lastName: "Owner",
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

      const memberDropdown = dropdowns[3];
      expect(memberDropdown).not.toBeDisabled();
      fireEvent.click(memberDropdown);

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
      mockIsOwner = false;
      mockCanEdit = true;

      render(<MembersSettingsPage />);

      const dropdowns = screen.getAllByLabelText("Role");
      expect(dropdowns.length).toBe(4);
    });

    it("blocks access and disables query for regular member without org:manage_members permission", () => {
      mockAuthUser = {
        id: "mem-2",
        firstName: "Tran",
        lastName: "Interviewer",
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
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(
        "You do not have permission to access this section. Please contact your administrator if you need access.",
      );
      expect(screen.queryAllByLabelText("Role")).toHaveLength(0);
    });

    it("disables dropdown for self (current user) and owner", () => {
      mockIsOwner = false;
      mockCanEdit = true;

      render(<MembersSettingsPage />);

      const dropdowns = screen.getAllByLabelText("Role");
      expect(dropdowns.length).toBe(4);

      expect(dropdowns[0]).toBeDisabled();
      expect(dropdowns[1]).toBeDisabled();
      expect(dropdowns[2]).not.toBeDisabled();
      expect(dropdowns[3]).not.toBeDisabled();
    });

    it("preserves stable member order (owner first, then createdAt asc) regardless of role changes", () => {
      mockAuthUser = {
        id: "mem-owner",
        firstName: "Le",
        lastName: "Owner",
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

        expect(dropdowns[0]).toBeDisabled();
        expect(dropdowns[1]).toBeDisabled();
        expect(dropdowns[1]).toHaveTextContent("Admin");
        expect(dropdowns[2]).toBeDisabled();
        expect(dropdowns[2]).toHaveTextContent("Admin");
        expect(dropdowns[3]).not.toBeDisabled();
        fireEvent.click(dropdowns[3]);
        expect(
          screen.queryByRole("option", { name: "Admin" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Recruiter" }),
        ).toBeInTheDocument();

        const actionButtons = screen.getAllByTitle("Thao tác thành viên");
        expect(actionButtons).toHaveLength(1);
      } finally {
        myPermsSpy.mockRestore();
      }
    });
  });

  it("filters members by search query and role and shows empty state plus join dates", () => {
    render(<MembersSettingsPage />);

    expect(screen.getByText(/Tham gia 04\/01\/2026/)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      "Tìm theo tên hoặc email...",
    );
    fireEvent.change(searchInput, { target: { value: "interviewer" } });

    expect(screen.getByText("Tran Interviewer")).toBeInTheDocument();
    expect(screen.queryByText("Nguyen Recruiter")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "does-not-exist" } });
    expect(
      screen.getByText("Không tìm thấy thành viên phù hợp."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));
    expect(screen.getByText("Nguyen Recruiter")).toBeInTheDocument();

    const roleFilterBtn = screen.getByLabelText("Lọc theo vai trò");
    fireEvent.click(roleFilterBtn);
    fireEvent.click(screen.getByRole("option", { name: "Member" }));

    expect(screen.getByText("Tran Interviewer")).toBeInTheDocument();
    expect(screen.queryByText("Nguyen Recruiter")).not.toBeInTheDocument();
  });
});
