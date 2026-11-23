import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmailLogsPage from "./page";
import type { EmailLog } from "@/lib/email-templates";

let mockLogs: EmailLog[] = [];

vi.mock("@/hooks/use-queries", () => ({
  useEmailLogs: () => ({
    data: {
      data: mockLogs,
      total: mockLogs.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
    isLoading: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "vi",
    t: (key: string) => {
      const map: Record<string, string> = {
        "email.outboxTitle": "Hộp thư đi",
        "email.outboxDesc": "Lịch sử gửi email",
        "email.searchRecipient": "Tìm kiếm...",
        "email.allStatuses": "Tất cả",
        "email.statusSent": "Đã gửi",
        "email.statusSimulated": "Mô phỏng",
        "email.statusFailed": "Thất bại",
        "email.thSentAt": "Thời gian",
        "email.thRecipient": "Người nhận",
        "email.thTemplate": "Mẫu sử dụng",
        "email.thSubject": "Tiêu đề",
        "email.thStatus": "Trạng thái",
        "email.thAction": "Thao tác",
        "email.viewDetails": "Chi tiết",
        "email.optOffer": "Đề nghị nhận việc",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("EmailLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogs = [
      {
        id: "log-snapshot",
        candidateName: "Nguyen Van Snapshot",
        candidateEmail: "snap@example.com",
        templateId: "tpl-custom-1",
        templateName: "Thư mời Tech Lead VIP",
        templateType: "INTERVIEW_INVITATION",
        subject: "Subject Snapshot",
        body: "<p>Snapshot body</p>",
        status: "SENT",
        sentAt: "2026-11-10T10:00:00.000Z",
        senderName: "HR Team",
        senderEmail: "hr@example.com",
      },
      {
        id: "log-legacy",
        candidateName: "Tran Van Legacy",
        candidateEmail: "legacy@example.com",
        templateId: null,
        templateName: null,
        templateType: "OFFER",
        subject: "Subject Legacy",
        body: "<p>Legacy body</p>",
        status: "SIMULATED",
        sentAt: "2026-11-09T10:00:00.000Z",
        senderName: "HR Team",
        senderEmail: "hr@example.com",
      },
    ];
  });

  it("displays templateName snapshot when available and falls back to localized templateType label for legacy logs", () => {
    render(<EmailLogsPage />);

    expect(screen.getByText("Thư mời Tech Lead VIP")).toBeInTheDocument();
    expect(screen.getByText("Đề nghị nhận việc")).toBeInTheDocument();

    // Open preview modal on snapshot log and verify snapshot name appears in preview modal header
    const detailBtns = screen.getAllByRole("button", { name: /Chi tiết/i });
    fireEvent.click(detailBtns[0]);
    expect(
      screen.getAllByText("Thư mời Tech Lead VIP").length,
    ).toBeGreaterThanOrEqual(2);
  });
});
