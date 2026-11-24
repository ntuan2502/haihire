import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import JoinOrganizationPage from "./page";
import { organizationsApi } from "@/lib/api";

const mockPush = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);
let currentLocale: "vi" | "en" = "vi";
let mockIsAuthenticated = false;
let mockAuthUser: {
  id: string;
  email: string;
  organizationId?: string | null;
} | null = null;

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "tok-max-uses" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isAuthenticated: mockIsAuthenticated,
    updateUserOrg: vi.fn(),
    logout: mockLogout,
  }),
}));

vi.mock("@/lib/api", () => ({
  organizationsApi: {
    getPublicInvite: vi.fn(),
    joinByToken: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const translations = {
  vi: {
    "join.title": "Tham gia tổ chức",
    "join.subtitle": "Bạn đã nhận được lời mời tham gia không gian tuyển dụng.",
    "join.verifying": "Đang xác minh lời mời...",
    "join.unableToJoin": "Không thể tham gia",
    "join.goToDashboard": "Vào Bảng điều khiển",
    "join.emailRestrictedNotice":
      "Lời mời này chỉ dành riêng cho email {email}.",
    "join.emailMismatchTitle": "Đang đăng nhập bằng tài khoản khác",
    "join.emailMismatchDesc":
      "Bạn đang đăng nhập bằng {currentEmail}, không khớp với email được mời ({invitedEmail}).",
    "join.switchAccountButton": "Đăng xuất & chuyển tài khoản",
    "join.switchingAccount": "Đang đăng xuất...",
    "join.joinOrgButton": "Tham gia {org}",
    "join.signInPrompt": "Đăng nhập để tiếp tục",
    "join.signInButton": "Đăng nhập",
    "join.createAccountButton": "Tạo tài khoản mới",
    "join.joinAs": "Tham gia với vai trò",
    "join.invitedBy": "Người mời",
    "members.roleMember": "Thành viên",
    "common.back": "Quay lại",
    "auth.invalidInvitation": "Liên kết mời tham gia không hợp lệ.",
    "errors.ORG_INVITE_MAX_USES_REACHED":
      "Liên kết mời tham gia này đã đạt giới hạn số lượt sử dụng tối đa.",
    "errors.ORG_INVITE_EXPIRED": "Liên kết mời tham gia này đã hết hạn.",
    "errors.ORG_INVITE_REVOKED": "Liên kết mời tham gia này đã bị thu hồi.",
    "errors.ORG_INVITE_INVALID": "Mã hoặc liên kết mời tham gia không hợp lệ.",
    "errors.ORG_INVITE_EMAIL_MISMATCH":
      "Lời mời này được gửi cho một địa chỉ email khác.",
  },
  en: {
    "join.title": "Join Organization",
    "join.subtitle": "You have been invited to join a recruitment workspace.",
    "join.verifying": "Verifying invitation...",
    "join.unableToJoin": "Unable to join",
    "join.goToDashboard": "Go to Dashboard",
    "join.emailRestrictedNotice": "Restricted to {email}.",
    "join.emailMismatchTitle": "Signed in with a different email",
    "join.emailMismatchDesc":
      "Signed in as {currentEmail}, invited email {invitedEmail}.",
    "join.switchAccountButton": "Sign out & switch account",
    "join.switchingAccount": "Signing out...",
    "join.joinOrgButton": "Join {org}",
    "join.signInPrompt": "Sign in",
    "join.signInButton": "Sign in",
    "join.createAccountButton": "Create account",
    "join.joinAs": "Join as",
    "join.invitedBy": "Invited by",
    "members.roleMember": "Member",
    "common.back": "Back",
    "auth.invalidInvitation": "Invalid invitation link.",
    "errors.ORG_INVITE_MAX_USES_REACHED":
      "This invitation link has reached its maximum allowed uses.",
    "errors.ORG_INVITE_EXPIRED": "This invitation link has expired.",
    "errors.ORG_INVITE_REVOKED": "This invitation link has been revoked.",
    "errors.ORG_INVITE_INVALID": "Invalid invitation code or link.",
    "errors.ORG_INVITE_EMAIL_MISMATCH":
      "This invitation was sent to a different email address.",
  },
} as const;

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: currentLocale,
    t: (key: string, params?: Record<string, string | number>) => {
      let text: string =
        translations[currentLocale][key as keyof (typeof translations)["vi"]] ??
        key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
  }),
}));

describe("JoinOrganizationPage error localization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = "vi";
    mockIsAuthenticated = false;
    mockAuthUser = null;
  });

  it("translates invalid invite code via errors.* dictionary instead of showing raw English backend message, and reacts to locale switch", async () => {
    vi.mocked(organizationsApi.getPublicInvite).mockResolvedValueOnce({
      valid: false,
      code: "ORG_INVITE_MAX_USES_REACHED",
      message: "This invitation link has reached its maximum allowed uses",
    });

    const { rerender } = render(<JoinOrganizationPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Liên kết mời tham gia này đã đạt giới hạn số lượt sử dụng tối đa.",
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(
        "This invitation link has reached its maximum allowed uses",
      ),
    ).not.toBeInTheDocument();

    // Switching language updates error text without re-calling getPublicInvite
    currentLocale = "en";
    rerender(<JoinOrganizationPage />);

    expect(
      screen.getByText(
        "This invitation link has reached its maximum allowed uses.",
      ),
    ).toBeInTheDocument();
    expect(organizationsApi.getPublicInvite).toHaveBeenCalledTimes(1);
  });

  it("falls back to auth.invalidInvitation when code and message are both absent", async () => {
    vi.mocked(organizationsApi.getPublicInvite).mockResolvedValueOnce({
      valid: false,
    });

    render(<JoinOrganizationPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Liên kết mời tham gia không hợp lệ."),
      ).toBeInTheDocument();
    });
  });

  it("shows restricted email notice for unauthenticated user on email-bound invite", async () => {
    vi.mocked(organizationsApi.getPublicInvite).mockResolvedValueOnce({
      valid: true,
      role: "RECRUITER",
      organization: { id: "org-1", name: "Acme", slug: "acme" },
      isEmailRestricted: true,
      maskedInvitedEmail: "n***a@haihire.vn",
      emailMismatch: false,
    });

    render(<JoinOrganizationPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Lời mời này chỉ dành riêng cho email n***a@haihire.vn.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("blocks Join CTA and offers account-switch when authenticated caller email mismatches invited email", async () => {
    mockIsAuthenticated = true;
    mockAuthUser = { id: "u-wrong", email: "wrong@gmail.com" };

    vi.mocked(organizationsApi.getPublicInvite).mockResolvedValueOnce({
      valid: true,
      role: "RECRUITER",
      organization: { id: "org-1", name: "Acme", slug: "acme" },
      isEmailRestricted: true,
      maskedInvitedEmail: "n***a@haihire.vn",
      emailMismatch: true,
    });

    render(<JoinOrganizationPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Đang đăng nhập bằng tài khoản khác"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Bạn đang đăng nhập bằng wrong@gmail.com, không khớp với email được mời (n***a@haihire.vn).",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Tham gia Acme/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Đăng xuất & chuyển tài khoản/ }),
    );
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledWith({
        redirectTo: "/auth/login?redirect=%2Fauth%2Fjoin%2Ftok-max-uses",
      });
    });
  });
});
