import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";

const mockRegister = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock auth-context
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    register: mockRegister,
    isAuthenticated: false,
    user: null,
    loading: false,
  }),
}));

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.recruiterSignUp": "Đăng ký tuyển dụng",
        "auth.registerTitle": "Tạo tài khoản mới",
        "auth.registerSubtitle": "Bắt đầu quản lý quy trình tuyển dụng",
        "auth.errorRegisterRequired": "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.",
        "auth.errorPasswordMinLength": "Mật khẩu phải có tối thiểu 6 ký tự.",
        "auth.fullNameLabel": "Họ và tên",
        "auth.fullNamePlaceholder": "Nguyễn Văn A",
        "auth.emailLabel": "Địa chỉ Email",
        "auth.emailPlaceholder": "recruiter@company.com",
        "auth.passwordLabel": "Mật khẩu",
        "auth.passwordPlaceholder": "••••••••",
        "auth.minPasswordLength": "Tối thiểu 6 ký tự",
        "auth.signUpButton": "Tạo tài khoản",
        "auth.signingUp": "Đang tạo tài khoản...",
        "auth.hasAccount": "Đã có tài khoản?",
        "auth.loginLink": "Đăng nhập ngay",
      };
      return translations[key] || key;
    },
  }),
}));

describe("RegisterPage Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders register form fields properly", () => {
    render(<RegisterPage />);

    expect(screen.getByText("Tạo tài khoản mới")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("recruiter@company.com")).toBeInTheDocument();
  });

  it("shows error when submitting empty fields", async () => {
    render(<RegisterPage />);

    const submitBtn = screen.getByRole("button", { name: /^Tạo tài khoản$/ });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText("Vui lòng nhập đầy đủ họ tên, email và mật khẩu.")
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows error when password is less than 6 characters", async () => {
    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText("Nguyễn Văn A");
    const emailInput = screen.getByPlaceholderText("recruiter@company.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(nameInput, { target: { value: "Nguyễn HR" } });
    fireEvent.change(emailInput, { target: { value: "hr@company.com" } });
    fireEvent.change(passwordInput, { target: { value: "12345" } });

    const submitBtn = screen.getByRole("button", { name: /^Tạo tài khoản$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Mật khẩu phải có tối thiểu 6 ký tự.")
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("submits valid registration form and calls register", async () => {
    mockRegister.mockResolvedValueOnce({ id: "user-new", organizationId: null });

    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText("Nguyễn Văn A");
    const emailInput = screen.getByPlaceholderText("recruiter@company.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(nameInput, { target: { value: "Trần Tuyển Dụng" } });
    fireEvent.change(emailInput, { target: { value: "tran@company.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    const submitBtn = screen.getByRole("button", { name: /^Tạo tài khoản$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "Trần Tuyển Dụng",
        "tran@company.com",
        "Password123!"
      );
      expect(mockPush).toHaveBeenCalledWith("/auth/onboarding");
    });
  });
});
