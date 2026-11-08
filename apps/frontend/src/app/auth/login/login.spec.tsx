import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { vi as viLocale } from "@/i18n/locales/vi";
import { DEMO_PASSWORD } from "@/constants/auth.constants";

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
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does NOT render demo buttons when NEXT_PUBLIC_ENABLE_DEMO_LOGIN is false", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "false";
    process.env.NODE_ENV = "test";

    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: viLocale.auth.loginTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(viLocale.auth.emailPlaceholder),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(viLocale.auth.quickLoginDev),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@tun\.io\.vn/)).not.toBeInTheDocument();
  });

  it("does NOT render demo buttons in production even if NEXT_PUBLIC_ENABLE_DEMO_LOGIN is true", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD = "dev-password";

    render(<LoginPage />);

    expect(
      screen.queryByText(viLocale.auth.quickLoginDev),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@tun\.io\.vn/)).not.toBeInTheDocument();
  });

  it("renders login form and demo buttons when flag is true in non-production with password", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD = "dev-password";

    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: viLocale.auth.loginTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(viLocale.auth.emailPlaceholder),
    ).toBeInTheDocument();
    expect(screen.getByText(viLocale.auth.quickLoginDev)).toBeInTheDocument();
    expect(screen.getByText(/admin@tun\.io\.vn/)).toBeInTheDocument();
  });

  it("shows validation error when submitting empty fields", async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", {
      name: new RegExp(`^${viLocale.auth.signInButton}$`),
    });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText(viLocale.auth.errorEmailPasswordRequired),
      ).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and calls login", async () => {
    mockLogin.mockResolvedValueOnce({ id: "user-1", organizationId: "org-1" });

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(
      viLocale.auth.emailPlaceholder,
    );
    const passwordInput = screen.getByPlaceholderText(
      viLocale.auth.passwordPlaceholder,
    );

    fireEvent.change(emailInput, {
      target: { value: "recruiter@example.com" },
    });
    fireEvent.change(passwordInput, { target: { value: "Secret123!" } });

    const submitBtn = screen.getByRole("button", { name: /^Đăng nhập$/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "recruiter@example.com",
        "Secret123!",
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("triggers quick login when clicking Demo Admin button if demo login enabled", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD = "dev-password";

    mockLogin.mockResolvedValueOnce({
      id: "admin-1",
      organizationId: "org-admin",
    });

    render(<LoginPage />);

    const demoAdminText = screen.getByText(/admin@tun\.io\.vn/);
    const demoAdminBtn = demoAdminText.closest("button");
    expect(demoAdminBtn).toBeDefined();

    if (demoAdminBtn) {
      fireEvent.click(demoAdminBtn);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          "admin@tun.io.vn",
          DEMO_PASSWORD,
        );
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    }
  });
});
