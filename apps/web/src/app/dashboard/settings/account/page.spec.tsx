import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountSettingsPage from "./page";
import { authApi } from "@/lib/api/auth";

const mockSetSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockSetLocale = vi.fn();
let mockCurrentUser: {
  id: string;
  name: string;
  email: string;
  preferredLanguage?: "vi" | "en" | null;
  preferredTimezone?: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    defaultLanguage?: "vi" | "en";
    timezone?: string;
    createdAt: string;
  };
} = {
  id: "user-1",
  name: "Recruiter Alice",
  email: "alice@example.com",
  organization: {
    id: "org-1",
    name: "Acme",
    slug: "acme",
    defaultLanguage: "vi",
    timezone: "Asia/Ho_Chi_Minh",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    logout: vi.fn(),
    setSession: mockSetSession,
    updateUser: mockUpdateUser,
  }),
}));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    changePassword: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    setLocale: mockSetLocale,
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
        "settings.accountPreferences.title":
          "Tùy chọn Ngôn ngữ & Múi giờ cá nhân",
        "settings.accountPreferences.subtitle":
          "Ghi đè cài đặt mặc định của tổ chức.",
        "settings.accountPreferences.languageLabel":
          "Ngôn ngữ giao diện ưu tiên",
        "settings.accountPreferences.languageHint": "Chọn ngôn ngữ ưu tiên.",
        "settings.accountPreferences.timezoneLabel": "Múi giờ ưu tiên",
        "settings.accountPreferences.timezoneHint": "Chọn múi giờ ưu tiên.",
        "settings.accountPreferences.followOrgDefault": "Theo mặc định tổ chức",
        "settings.accountPreferences.saveBtn": "Lưu tùy chọn",
        "settings.accountPreferences.savingBtn": "Đang lưu...",
        "settings.accountPreferences.saveSuccess":
          "Đã lưu tùy chọn ngôn ngữ & múi giờ cá nhân.",
        "settings.accountPreferences.saveError": "Không thể lưu tùy chọn.",
        "settings.localization.languages.vi": "Tiếng Việt (Vietnamese)",
        "settings.localization.languages.en": "Tiếng Anh (English)",
        "settings.localization.timezoneSearchPlaceholder":
          "Tìm múi giờ, thành phố hoặc UTC...",
        "settings.localization.timezoneNoMatch": "Không tìm thấy múi giờ.",
      };
      return dict[key] || key;
    },
  }),
}));

describe("AccountSettingsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      id: "user-1",
      name: "Recruiter Alice",
      email: "alice@example.com",
      preferredLanguage: null,
      preferredTimezone: null,
      organization: {
        id: "org-1",
        name: "Acme",
        slug: "acme",
        defaultLanguage: "vi",
        timezone: "Asia/Ho_Chi_Minh",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };
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

  it("allows selecting personal language & searchable timezone override and persisting them", async () => {
    vi.mocked(authApi.updatePreferences).mockResolvedValueOnce({
      id: "user-1",
      name: "Recruiter Alice",
      email: "alice@example.com",
      role: "ADMIN",
      preferredLanguage: "en",
      preferredTimezone: "Asia/Tokyo",
      organizationId: "org-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    render(<AccountSettingsPage />);

    const langTrigger = screen.getByRole("button", {
      name: "Ngôn ngữ giao diện ưu tiên",
    });
    fireEvent.click(langTrigger);
    fireEvent.click(
      screen.getByRole("option", { name: "Tiếng Anh (English)" }),
    );

    const tzTrigger = screen.getByRole("button", {
      name: "Múi giờ ưu tiên",
    });
    fireEvent.click(tzTrigger);
    const searchInput = screen.getByPlaceholderText(
      "Tìm múi giờ, thành phố hoặc UTC...",
    );
    fireEvent.change(searchInput, { target: { value: "Tokyo" } });
    fireEvent.click(
      screen.getByRole("option", { name: /Osaka, Sapporo, Tokyo/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));

    await waitFor(() => {
      expect(authApi.updatePreferences).toHaveBeenCalledWith({
        preferredLanguage: "en",
        preferredTimezone: "Asia/Tokyo",
      });
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredLanguage: "en",
        preferredTimezone: "Asia/Tokyo",
      }),
    );
    expect(mockSetLocale).toHaveBeenCalledWith("en");
    expect(
      await screen.findByText("Đã lưu tùy chọn ngôn ngữ & múi giờ cá nhân."),
    ).toBeInTheDocument();
  });

  it("resets personal preferences back to null when Follow organization default is chosen", async () => {
    mockCurrentUser.preferredLanguage = "en";
    mockCurrentUser.preferredTimezone = "Asia/Tokyo";
    vi.mocked(authApi.updatePreferences).mockResolvedValueOnce({
      id: "user-1",
      name: "Recruiter Alice",
      email: "alice@example.com",
      role: "ADMIN",
      preferredLanguage: null,
      preferredTimezone: null,
      organizationId: "org-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    render(<AccountSettingsPage />);

    const langTrigger = screen.getByRole("button", {
      name: "Ngôn ngữ giao diện ưu tiên",
    });
    fireEvent.click(langTrigger);
    fireEvent.click(
      screen.getByRole("option", { name: /Theo mặc định tổ chức/i }),
    );

    const tzTrigger = screen.getByRole("button", {
      name: "Múi giờ ưu tiên",
    });
    fireEvent.click(tzTrigger);
    fireEvent.click(
      screen.getByRole("option", { name: /Theo mặc định tổ chức/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu tùy chọn" }));

    await waitFor(() => {
      expect(authApi.updatePreferences).toHaveBeenCalledWith({
        preferredLanguage: null,
        preferredTimezone: null,
      });
    });

    expect(mockSetLocale).toHaveBeenCalledWith("vi");
  });
});
