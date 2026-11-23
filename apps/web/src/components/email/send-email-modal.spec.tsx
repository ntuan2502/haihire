import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SendEmailModal } from "./send-email-modal";
import type { EmailFlowConfig, EmailTemplate } from "@/lib/email-templates";

const mockSendEmailMutateAsync = vi.fn();
let mockTemplates: EmailTemplate[] = [];
let mockFlows: EmailFlowConfig[] = [];

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/hooks/use-queries", () => ({
  useEmailTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useSendEmailMutation: () => ({
    mutateAsync: mockSendEmailMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-email-queries", () => ({
  useEmailFlows: () => ({ data: mockFlows, isLoading: false }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "email.modalTitle": "Gửi Email cho ứng viên",
        "email.selectTemplate": "Chọn mẫu Email",
        "email.customAdHocOption": "Soạn email tùy chỉnh",
        "email.optApplicationConfirmation": "Xác nhận ứng tuyển",
        "email.optInterviewInvitation": "Mời phỏng vấn",
        "email.optRejection": "Từ chối",
        "email.optOffer": "Đề nghị nhận việc",
        "email.optCustom": "Tùy chỉnh",
        "email.subject": "Tiêu đề Email",
        "email.sendBtn": "Gửi Email",
        "email.sendingBtn": "Đang gửi...",
        "email.cancel": "Hủy",
        "email.sendSuccessToast": "Đã gửi",
        "email.tabCompose": "Soạn thảo",
        "email.livePreview": "Xem trước",
        "email.recipient": "Người nhận",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("SendEmailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmailMutateAsync.mockResolvedValue({ id: "log-1" });
    mockTemplates = [
      {
        id: "tpl-confirm",
        type: "APPLICATION_CONFIRMATION",
        name: "Xác nhận tiêu chuẩn",
        subject: "Xác nhận {{candidate_name}} - {{job_title}}",
        body: "<p>Đã nhận hồ sơ của {{candidate_name}}</p>",
        enabled: true,
        isSystem: true,
      },
      {
        id: "tpl-vip-interview",
        type: "INTERVIEW_INVITATION",
        name: "Phỏng vấn Tech Lead",
        subject: "Mời Tech Lead {{candidate_name}}",
        body: "<p>Mời bạn {{candidate_name}} phỏng vấn {{job_title}}</p>",
        enabled: true,
        isSystem: false,
      },
      {
        id: "tpl-disabled",
        type: "OFFER",
        name: "Mẫu đã tắt",
        subject: "Should hide",
        body: "<p>Hidden</p>",
        enabled: false,
        isSystem: false,
      },
    ];
    mockFlows = [
      {
        id: "flow-intv",
        flowKey: "INTERVIEW_SCHEDULED",
        templateId: "tpl-vip-interview",
        enabled: true,
        template: mockTemplates[1],
      },
    ];
  });

  it("loads enabled templates (hiding disabled ones), defaults by defaultFlowKey, and sends templateId + templateName", async () => {
    render(
      <SendEmailModal
        isOpen={true}
        onClose={vi.fn()}
        candidate={{
          id: "cand-1",
          name: "Le Thi C",
          email: "lethic@example.com",
        }}
        jobTitle="Fullstack Engineer"
        defaultFlowKey="INTERVIEW_SCHEDULED"
      />,
    );

    const subjectInput = screen.getByDisplayValue("Mời Tech Lead Le Thi C");
    expect(subjectInput).toBeInTheDocument();

    // Open template dropdown: active templates + ad-hoc shown, disabled hidden
    fireEvent.click(screen.getByText(/Phỏng vấn Tech Lead \(Mời phỏng vấn\)/));
    expect(screen.queryByText(/Mẫu đã tắt/)).not.toBeInTheDocument();
    expect(screen.getByText(/Soạn email tùy chỉnh/)).toBeInTheDocument();

    // Close dropdown and submit default flow selection
    fireEvent.click(screen.getByRole("button", { name: "Gửi Email" }));

    await waitFor(() => {
      expect(mockSendEmailMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "lethic@example.com",
          templateId: "tpl-vip-interview",
          templateName: "Phỏng vấn Tech Lead",
          templateType: "INTERVIEW_INVITATION",
        }),
      );
    });
  });

  it("allows switching to custom ad-hoc draft without templateId", async () => {
    render(
      <SendEmailModal
        isOpen={true}
        onClose={vi.fn()}
        candidate={{
          id: "cand-1",
          name: "Le Thi C",
          email: "lethic@example.com",
        }}
        jobTitle="Fullstack Engineer"
      />,
    );

    fireEvent.click(screen.getByText(/Xác nhận tiêu chuẩn/));
    fireEvent.click(await screen.findByText(/Soạn email tùy chỉnh/));

    fireEvent.click(screen.getByRole("button", { name: "Gửi Email" }));

    await waitFor(() => {
      const payload = mockSendEmailMutateAsync.mock.calls[0]?.[0];
      expect(payload).toBeDefined();
      expect(payload.templateId).toBeUndefined();
      expect(payload.templateName).toBe("Soạn email tùy chỉnh");
      expect(payload.templateType).toBe("CUSTOM");
    });
  });
});
