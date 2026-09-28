import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const mockLogin = vi.fn();
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
    login: mockLogin,
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
        "auth.recruiterSignIn": "Cổng tuyển dụng",
        "auth.loginTitle": "Đăng nhập",
        "auth.loginSubtitle": "Nhập email và mật khẩu",
        "auth.errorEmailPasswordRequired": "Vui lòng nhập đầy đủ email và mật khẩu.",
        "auth.emailLabel": "Địa chỉ Email",
        "auth.emailPlaceholder": "recruiter@company.com",
        "auth.passwordLabel": "Mật khẩu",
        "auth.passwordPlaceholder": "••••••••",
        "auth.signInButton": "Đăng nhập",
        "auth.signingIn": "Đang đăng nhập...",
        "auth.quickLoginDev": "Tài khoản thử nghiệm nhanh",
        "auth.orEmail": "Hoặc đăng nhập bằng email",
        "auth.noAccount": "Chưa có tài khoản?",
        "auth.signUpLink": "Đăng ký ngay",
      };
      return translations[key] || key;
    },
  }),
}));

describe("LoginPage Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form and demo buttons properly", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("recruiter@company.com")).toBeInTheDocument();
    expect(screen.getByText("Tài khoản thử nghiệm nhanh")).toBeInTheDocument();
  });

  it("shows validation error when submitting empty fields", async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: /^Đăng nhập$/ });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Vui lòng nhập đầy đủ email và mật khẩu.")).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and calls login", async () => {
    mockLogin.mockResolvedValueOnce({ id: "user-1", organizationId: "org-1" });

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("recruiter@company.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(emailInput, { target: { value: "recruiter@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Secret123!" } });

    const submitBtn = screen.getByRole("button", { name: /^Đăng nhập$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("recruiter@example.com", "Secret123!");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("triggers quick login when clicking Demo Admin button", async () => {
    mockLogin.mockResolvedValueOnce({ id: "admin-1", organizationId: "org-admin" });

    render(<LoginPage />);

    // Click on Admin demo card button using unique admin email text
    const demoAdminText = screen.getByText(/admin@tun\.io\.vn/);
    const demoAdminBtn = demoAdminText.closest("button");
    expect(demoAdminBtn).toBeDefined();

    if (demoAdminBtn) {
      fireEvent.click(demoAdminBtn);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("admin@tun.io.vn", "password123");
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    }
  });
});
