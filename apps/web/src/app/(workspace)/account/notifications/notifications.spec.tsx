import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountNotificationsPage from "./page";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Alice Recruiter",
      organizationId: "org-1",
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    },
  }),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "common.saveChanges": "Lưu thay đổi",
        "common.saving": "Đang lưu...",
        "settings.tabs.notifications": "Thông báo của tôi",
        "settings.tabs.notificationsSub": "Thông báo trong workspace hiện tại.",
        "settings.tabs.notificationsScope": `Chỉ áp dụng cho bạn trong ${params?.workspace ?? ""}.`,
        "notificationSettings.website": "Trên Website",
        "notificationSettings.email": "Qua Email",
        "notificationSettings.application": "Hồ sơ ứng tuyển mới",
        "notificationSettings.interview": "Lịch phỏng vấn",
        "notificationSettings.saved": "Đã lưu cài đặt thông báo.",
        "notificationSettings.saveError": "Không thể lưu cài đặt thông báo.",
        "notificationSettings.loadError": "Không thể tải cài đặt thông báo.",
      };
      return dict[key] || key;
    },
  }),
}));

describe("AccountNotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      data: {
        applicationWebsite: true,
        applicationEmail: false,
        interviewWebsite: true,
        interviewEmail: true,
      },
    });
    vi.mocked(api.put).mockResolvedValue({
      data: {
        applicationWebsite: false,
        applicationEmail: false,
        interviewWebsite: true,
        interviewEmail: true,
      },
    });
  });

  it("loads and updates notification preferences cleanly", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AccountNotificationsPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Chỉ áp dụng cho bạn trong Acme."),
    ).toBeInTheDocument();

    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);

    const saveBtn = screen.getByRole("button", { name: "Lưu thay đổi" });
    expect(saveBtn).toBeDisabled();

    fireEvent.click(checkboxes[0]);
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/notifications/preferences", {
        applicationWebsite: false,
        applicationEmail: false,
        interviewWebsite: true,
        interviewEmail: true,
      });
      expect(toast.success).toHaveBeenCalledWith("Đã lưu cài đặt thông báo.");
    });
  });
});
