import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import JoinOrganizationPage from "./page";
import { organizationsApi } from "@/lib/api";

const mockPush = vi.fn();
let currentLocale: "vi" | "en" = "vi";

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "tok-max-uses" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    updateUserOrg: vi.fn(),
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
    "common.back": "Quay lại",
    "auth.invalidInvitation": "Liên kết mời tham gia không hợp lệ.",
    "errors.ORG_INVITE_MAX_USES_REACHED":
      "Liên kết mời tham gia này đã đạt giới hạn số lượt sử dụng tối đa.",
    "errors.ORG_INVITE_EXPIRED": "Liên kết mời tham gia này đã hết hạn.",
    "errors.ORG_INVITE_REVOKED": "Liên kết mời tham gia này đã bị thu hồi.",
    "errors.ORG_INVITE_INVALID": "Mã hoặc liên kết mời tham gia không hợp lệ.",
  },
  en: {
    "join.title": "Join Organization",
    "join.subtitle": "You have been invited to join a recruitment workspace.",
    "join.verifying": "Verifying invitation...",
    "join.unableToJoin": "Unable to join",
    "join.goToDashboard": "Go to Dashboard",
    "common.back": "Back",
    "auth.invalidInvitation": "Invalid invitation link.",
    "errors.ORG_INVITE_MAX_USES_REACHED":
      "This invitation link has reached its maximum allowed uses.",
    "errors.ORG_INVITE_EXPIRED": "This invitation link has expired.",
    "errors.ORG_INVITE_REVOKED": "This invitation link has been revoked.",
    "errors.ORG_INVITE_INVALID": "Invalid invitation code or link.",
  },
} as const;

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: currentLocale,
    t: (key: string) =>
      translations[currentLocale][key as keyof (typeof translations)["vi"]] ??
      key,
  }),
}));

describe("JoinOrganizationPage error localization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = "vi";
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
});
