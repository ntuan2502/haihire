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
let mockRegisterAuthState: {
  register: typeof mockRegister;
  isAuthenticated: boolean;
  user: { id: string; organizationId?: string | null } | null;
  loading: boolean;
} = {
  register: mockRegister,
  isAuthenticated: false,
  user: null,
  loading: false,
};

vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockRegisterAuthState,
}));

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "vi",
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.loading": "Đang tải...",
        "auth.alreadySignedIn": "Đã đăng nhập thành công. Đang chuyển hướng...",
        "auth.recruiterSignUp": "Đăng ký tuyển dụng",
        "auth.registerTitle": "Tạo tài khoản mới",
        "auth.registerSubtitle": "Bắt đầu quản lý quy trình tuyển dụng",
        "auth.errorRegisterRequired":
          "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.",
        "auth.errorPasswordMinLength": "Mật khẩu phải có tối thiểu 6 ký tự.",
        "auth.firstNameLabel": "Tên",
        "auth.firstNamePlaceholder": "Văn A",
        "auth.lastNameLabel": "Họ và tên đệm",
        "auth.lastNamePlaceholder": "Nguyễn",
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
    mockRegisterAuthState = {
      register: mockRegister,
      isAuthenticated: false,
      user: null,
      loading: false,
    };
  });

  it("renders register form fields properly", () => {
    render(<RegisterPage />);

    expect(screen.getByText("Tạo tài khoản mới")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nguyễn")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Văn A")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("recruiter@company.com"),
    ).toBeInTheDocument();
  });

  it("shows error when submitting empty fields", async () => {
    render(<RegisterPage />);

    const submitBtn = screen.getByRole("button", { name: /^Tạo tài khoản$/ });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText("Vui lòng nhập đầy đủ họ tên, email và mật khẩu."),
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows error when password is less than 6 characters", async () => {
    render(<RegisterPage />);

    const lastNameInput = screen.getByPlaceholderText("Nguyễn");
    const firstNameInput = screen.getByPlaceholderText("Văn A");
    const emailInput = screen.getByPlaceholderText("recruiter@company.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(lastNameInput, { target: { value: "Nguyễn" } });
    fireEvent.change(firstNameInput, { target: { value: "HR" } });
    fireEvent.change(emailInput, { target: { value: "hr@company.com" } });
    fireEvent.change(passwordInput, { target: { value: "12345" } });

    const submitBtn = screen.getByRole("button", { name: /^Tạo tài khoản$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Mật khẩu phải có tối thiểu 6 ký tự."),
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("submits valid registration form and calls register", async () => {
    mockRegister.mockResolvedValueOnce({
      id: "user-new",
      organizationId: null,
    });

    render(<RegisterPage />);

    const lastNameInput = screen.getByPlaceholderText("Nguyễn");
    const firstNameInput = screen.getByPlaceholderText("Văn A");
    const emailInput = screen.getByPlaceholderText("recruiter@company.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(lastNameInput, { target: { value: "Trần" } });
    fireEvent.change(firstNameInput, { target: { value: "Tuyển Dụng" } });
    fireEvent.change(emailInput, { target: { value: "tran@company.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });

    const submitBtn = screen.getByRole("button", { name: /^Tạo tài khoản$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "Tuyển Dụng",
        "Trần",
        "tran@company.com",
        "Password123!",
      );
      expect(mockPush).toHaveBeenCalledWith("/auth/onboarding");
    });
  });

  it("renders neutral loading text instead of alreadySignedIn while authLoading is true and unauthenticated", () => {
    mockRegisterAuthState = {
      register: mockRegister,
      isAuthenticated: false,
      user: null,
      loading: true,
    };

    render(<RegisterPage />);

    expect(screen.getByText("Đang tải...")).toBeInTheDocument();
    expect(
      screen.queryByText("Đã đăng nhập thành công. Đang chuyển hướng..."),
    ).not.toBeInTheDocument();
  });
});
