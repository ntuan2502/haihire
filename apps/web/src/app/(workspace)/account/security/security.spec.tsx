import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import AccountSecurityPage from "./page";
import { authApi } from "@/lib/api/auth";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSetSession = vi.fn();
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Alice Recruiter",
      email: "alice@example.com",
    },
    setSession: mockSetSession,
  }),
}));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    changePassword: vi.fn(),
  },
}));

const mockRevokeSessionMutate = vi.fn().mockResolvedValue({ success: true });
const mockRevokeOthersMutate = vi
  .fn()
  .mockResolvedValue({ success: true, revokedCount: 1 });
let capturedLogParams: Record<string, unknown> | undefined;

vi.mock("@/hooks/use-account-security", () => ({
  useUserSessionsQuery: () => ({
    data: [
      {
        id: "sess-1",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 Chrome/124.0 Windows NT 10.0",
        lastActiveAt: "2026-11-25T08:00:00.000Z",
        expiresAt: "2026-12-02T08:00:00.000Z",
        createdAt: "2026-11-25T07:00:00.000Z",
        isCurrent: true,
      },
      {
        id: "sess-2",
        ipAddress: "10.0.0.5",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1",
        lastActiveAt: "2026-11-24T12:00:00.000Z",
        expiresAt: "2026-12-01T12:00:00.000Z",
        createdAt: "2026-11-24T11:00:00.000Z",
        isCurrent: false,
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useRevokeSessionMutation: () => ({
    mutateAsync: mockRevokeSessionMutate,
    isPending: false,
  }),
  useRevokeOtherSessionsMutation: () => ({
    mutateAsync: mockRevokeOthersMutate,
    isPending: false,
  }),
  useUserSecurityLogsQuery: (params?: Record<string, unknown>) => {
    capturedLogParams = params;
    return {
      data: {
        data: [
          {
            id: "sec-1",
            userId: "user-1",
            action: "AUTH_LOGIN",
            status: "SUCCESS",
            ipAddress: "127.0.0.1",
            userAgent: "Chrome/124 Windows NT 10.0",
            metadata: null,
            createdAt: "2026-11-25T08:00:00.000Z",
          },
          {
            id: "sec-2",
            action: "AUTH_LOGIN_FAILED",
            status: "WARNING",
            ipAddress: "10.0.0.8",
            userAgent: "Firefox/122 Linux",
            metadata: null,
            createdAt: "2026-11-24T08:00:00.000Z",
          },
        ],
        total: 2,
        limit: 10,
        offset: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
    };
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "settings.accountSecurity.title": "Bảo mật & Phiên đăng nhập",
        "settings.accountSecurity.subtitle":
          "Quản lý mật khẩu và phiên làm việc.",
        "settings.accountSecurity.sessionsTitle":
          "Phiên đăng nhập đang hoạt động",
        "settings.accountSecurity.sessionsSubtitle":
          "Các thiết bị đang đăng nhập.",
        "settings.accountSecurity.currentSessionBadge": "Thiết bị hiện tại",
        "settings.accountSecurity.unknownDevice": "Thiết bị không xác định",
        "settings.accountSecurity.unknownIp": "Không rõ IP",
        "settings.accountSecurity.lastActive": `Hoạt động gần nhất ${params?.time ?? ""}`,
        "settings.accountSecurity.signedInAt": `Đăng nhập lúc ${params?.time ?? ""}`,
        "settings.accountSecurity.signOutDevice": "Đăng xuất",
        "settings.accountSecurity.signOutDeviceTitle":
          "Đăng xuất thiết bị này?",
        "settings.accountSecurity.signOutDeviceDesc":
          "Phiên làm việc sẽ kết thúc.",
        "settings.accountSecurity.signOutDeviceSuccess":
          "Đã đăng xuất thiết bị thành công.",
        "settings.accountSecurity.revokeOthersBtn":
          "Đăng xuất tất cả thiết bị khác",
        "settings.accountSecurity.revokeOthersTitle":
          "Đăng xuất khỏi tất cả thiết bị khác?",
        "settings.accountSecurity.revokeOthersDesc": "Chấm dứt mọi phiên khác.",
        "settings.accountSecurity.revokeOthersConfirm":
          "Đăng xuất các thiết bị khác",
        "settings.accountSecurity.revokeOthersSuccess": `Đã đăng xuất khỏi ${params?.count ?? 0} phiên làm việc khác.`,
        "settings.accountSecurity.logsTitle": "Nhật ký bảo mật cá nhân",
        "settings.accountSecurity.logsSubtitle": "Lịch sử bảo mật riêng tư.",
        "settings.accountSecurity.filterAll": "Tất cả",
        "settings.accountSecurity.filterAuth": "Đăng nhập",
        "settings.accountSecurity.filterSecurity": "Bảo mật",
        "settings.accountSecurity.actions.AUTH_LOGIN": "Đăng nhập thành công",
        "settings.accountSecurity.actions.AUTH_LOGIN_FAILED":
          "Đăng nhập thất bại",
        "settings.accountSecurity.statusSuccess": "Thành công",
        "settings.accountSecurity.statusFailed": "Thất bại",
        "settings.changePasswordTitle": "Đổi mật khẩu",
        "settings.changePasswordSub": "Cập nhật mật khẩu tài khoản định kỳ",
        "settings.currentPassword": "Mật khẩu hiện tại",
        "settings.currentPasswordPlaceholder": "Nhập mật khẩu hiện tại",
        "settings.newPassword": "Mật khẩu mới",
        "settings.newPasswordPlaceholder":
          "Nhập mật khẩu mới (tối thiểu 6 ký tự)",
        "settings.confirmNewPassword": "Xác nhận mật khẩu mới",
        "settings.confirmNewPasswordPlaceholder": "Nhập lại mật khẩu mới",
        "settings.updatePasswordBtn": "Cập nhật mật khẩu",
        "settings.updatingPassword": "Đang cập nhật...",
        "settings.passwordChangedSuccess": "Đổi mật khẩu thành công.",
        "settings.passwordMismatchError": "Mật khẩu xác nhận không khớp.",
        "settings.passwordTooShortError":
          "Mật khẩu mới phải có ít nhất 6 ký tự.",
        "settings.currentPasswordRequiredError":
          "Vui lòng nhập mật khẩu hiện tại.",
        "errors.INVALID_CURRENT_PASSWORD": "Mật khẩu hiện tại không chính xác.",
        "common.cancel": "Hủy",
      };
      return dict[key] || key;
    },
  }),
}));

function renderSecurityPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AccountSecurityPage />
    </QueryClientProvider>,
  );
}

describe("AccountSecurityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedLogParams = undefined;
  });

  it("submits password change with validation and rotates session tokens", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({
      success: true,
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    renderSecurityPage();

    fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu hiện tại"), {
      target: { value: "oldPass123" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Nhập mật khẩu mới (tối thiểu 6 ký tự)"),
      { target: { value: "newPass456" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Nhập lại mật khẩu mới"), {
      target: { value: "newPass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật mật khẩu" }));

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "oldPass123",
        newPassword: "newPass456",
      });
      expect(mockSetSession).toHaveBeenCalledWith(
        "new-access",
        "new-refresh",
        undefined,
      );
      expect(toast.success).toHaveBeenCalledWith("Đổi mật khẩu thành công.");
    });
  });

  it("allows signing out an individual non-current device and all other devices", async () => {
    renderSecurityPage();

    const currentRow = screen.getByTestId("session-row-sess-1");
    expect(
      within(currentRow).getByText("Thiết bị hiện tại"),
    ).toBeInTheDocument();
    expect(
      within(currentRow).queryByRole("button", { name: "Đăng xuất" }),
    ).not.toBeInTheDocument();

    const otherRow = screen.getByTestId("session-row-sess-2");
    fireEvent.click(
      within(otherRow).getByRole("button", { name: "Đăng xuất" }),
    );

    const singleDialog = screen.getByRole("dialog");
    expect(
      within(singleDialog).getByText("Đăng xuất thiết bị này?"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(singleDialog).getByRole("button", { name: "Đăng xuất" }),
    );

    await waitFor(() => {
      expect(mockRevokeSessionMutate).toHaveBeenCalledWith("sess-2");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Đăng xuất tất cả thiết bị khác" }),
    );
    const bulkDialog = screen.getByRole("dialog");
    fireEvent.click(
      within(bulkDialog).getByRole("button", {
        name: "Đăng xuất các thiết bị khác",
      }),
    );

    await waitFor(() => {
      expect(mockRevokeOthersMutate).toHaveBeenCalledTimes(1);
    });
  });

  it("renders security logs and switches category filters", () => {
    renderSecurityPage();

    expect(screen.getByTestId("security-log-row-sec-1")).toBeInTheDocument();
    expect(screen.getByTestId("security-log-row-sec-2")).toBeInTheDocument();
    expect(capturedLogParams).toMatchObject({
      category: "all",
      limit: 10,
      offset: 0,
    });

    fireEvent.click(screen.getByRole("button", { name: "Bảo mật" }));
    expect(capturedLogParams).toMatchObject({
      category: "security",
      limit: 10,
      offset: 0,
    });
  });
});
