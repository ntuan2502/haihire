import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountSettingsPage from "./page";
import { authApi } from "@/lib/api/auth";

const mockSetSession = vi.fn();
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Recruiter Alice", email: "alice@example.com" },
    logout: vi.fn(),
    setSession: mockSetSession,
  }),
}));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    changePassword: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "settings.tabs.account": "Tài khoản",
        "settings.tabs.accountSub": "Thông tin cá nhân & bảo mật",
        "settings.yourName": "Họ và tên",
        "settings.emailAddress": "Địa chỉ email",
        "nav.signOut": "Đăng xuất",
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
        "settings.updatingPassword": "Đang cập nhật mật khẩu...",
        "settings.passwordChangedSuccess": "Đổi mật khẩu thành công.",
        "settings.passwordMismatchError": "Mật khẩu xác nhận không khớp.",
        "settings.passwordTooShortError":
          "Mật khẩu mới phải có ít nhất 6 ký tự.",
        "settings.currentPasswordRequiredError":
          "Vui lòng nhập mật khẩu hiện tại.",
        "errors.INVALID_CURRENT_PASSWORD": "Mật khẩu hiện tại không chính xác.",
      };
      return dict[key] || key;
    },
  }),
}));

describe("AccountSettingsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user information and password change form", () => {
    render(<AccountSettingsPage />);

    expect(screen.getByDisplayValue("Recruiter Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Đổi mật khẩu")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Nhập mật khẩu hiện tại"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Nhập mật khẩu mới (tối thiểu 6 ký tự)"),
    ).toBeInTheDocument();
  });

  it("shows error when current password is empty", async () => {
    render(<AccountSettingsPage />);

    const submitBtn = screen.getByText("Cập nhật mật khẩu").closest("button");
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Vui lòng nhập mật khẩu hiện tại."),
      ).toBeInTheDocument();
    });
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("shows error when new password is less than 6 characters", async () => {
    render(<AccountSettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu hiện tại"), {
      target: { value: "oldPassword123" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Nhập mật khẩu mới (tối thiểu 6 ký tự)"),
      { target: { value: "123" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Nhập lại mật khẩu mới"), {
      target: { value: "123" },
    });

    const submitBtn = screen.getByText("Cập nhật mật khẩu").closest("button");
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Mật khẩu mới phải có ít nhất 6 ký tự."),
      ).toBeInTheDocument();
    });
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("shows error when new password and confirm password do not match", async () => {
    render(<AccountSettingsPage />);

    fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu hiện tại"), {
      target: { value: "oldPassword123" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Nhập mật khẩu mới (tối thiểu 6 ký tự)"),
      { target: { value: "newSecret456" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Nhập lại mật khẩu mới"), {
      target: { value: "differentPassword" },
    });

    const submitBtn = screen.getByText("Cập nhật mật khẩu").closest("button");
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Mật khẩu xác nhận không khớp."),
      ).toBeInTheDocument();
    });
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("submits change password successfully and clears form", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({
      success: true,
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
    render(<AccountSettingsPage />);

    const currentInput = screen.getByPlaceholderText("Nhập mật khẩu hiện tại");
    const newInput = screen.getByPlaceholderText(
      "Nhập mật khẩu mới (tối thiểu 6 ký tự)",
    );
    const confirmInput = screen.getByPlaceholderText("Nhập lại mật khẩu mới");

    fireEvent.change(currentInput, { target: { value: "oldSecret123" } });
    fireEvent.change(newInput, { target: { value: "newSecret456" } });
    fireEvent.change(confirmInput, { target: { value: "newSecret456" } });

    const submitBtn = screen.getByText("Cập nhật mật khẩu").closest("button");
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "oldSecret123",
        newPassword: "newSecret456",
      });
      expect(screen.getByText("Đổi mật khẩu thành công.")).toBeInTheDocument();
    });

    // Inputs should be cleared
    expect((currentInput as HTMLInputElement).value).toBe("");
    expect((newInput as HTMLInputElement).value).toBe("");
    expect((confirmInput as HTMLInputElement).value).toBe("");
    expect(mockSetSession).toHaveBeenCalledWith(
      "new-access-token",
      "new-refresh-token",
      undefined,
    );
  });

  it("displays error message when current password does not match", async () => {
    vi.mocked(authApi.changePassword).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          statusCode: 400,
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password does not match",
        },
      },
    });
    render(<AccountSettingsPage />);

    const currentInput = screen.getByPlaceholderText("Nhập mật khẩu hiện tại");
    const newInput = screen.getByPlaceholderText(
      "Nhập mật khẩu mới (tối thiểu 6 ký tự)",
    );
    const confirmInput = screen.getByPlaceholderText("Nhập lại mật khẩu mới");

    fireEvent.change(currentInput, { target: { value: "wrongPass123" } });
    fireEvent.change(newInput, { target: { value: "newSecret456" } });
    fireEvent.change(confirmInput, { target: { value: "newSecret456" } });

    const submitBtn = screen.getByText("Cập nhật mật khẩu").closest("button");
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Mật khẩu hiện tại không chính xác."),
      ).toBeInTheDocument();
    });
  });
});
