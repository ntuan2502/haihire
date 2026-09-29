import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { vi as viLocale } from "@/i18n/locales/vi";

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

describe("LoginPage Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form and demo buttons properly", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: viLocale.auth.loginTitle })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(viLocale.auth.emailPlaceholder)).toBeInTheDocument();
    expect(screen.getByText(viLocale.auth.quickLoginDev)).toBeInTheDocument();
  });

  it("shows validation error when submitting empty fields", async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: new RegExp(`^${viLocale.auth.signInButton}$`) });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(viLocale.auth.errorEmailPasswordRequired)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and calls login", async () => {
    mockLogin.mockResolvedValueOnce({ id: "user-1", organizationId: "org-1" });

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(viLocale.auth.emailPlaceholder);
    const passwordInput = screen.getByPlaceholderText(viLocale.auth.passwordPlaceholder);

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
