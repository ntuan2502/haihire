import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RejectApplicationModal } from "./reject-application-modal";
import type { EmailFlowConfig, EmailTemplate } from "@/lib/email-templates";

let mockCanViewEmail = false;
let mockTemplates: EmailTemplate[] = [];
let mockFlows: EmailFlowConfig[] = [];

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanViewEmail,
}));

vi.mock("@/hooks/use-email-queries", () => ({
  useEmailTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useEmailFlows: () => ({ data: mockFlows, isLoading: false }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        "applications.rejectModal.title": "Từ chối ứng viên",
        "applications.rejectModal.description": `Chuyển ${params?.name ?? ""} sang trạng thái Từ chối cho vị trí ${params?.job ?? ""}.`,
        "applications.rejectModal.reasonLabel": "Lý do từ chối (tùy chọn)",
        "applications.rejectModal.reasonPlaceholder":
          "Nhập lý do từ chối (chỉ hiển thị nội bộ cho đội ngũ tuyển dụng)...",
        "applications.rejectModal.sendEmailLabel": `Gửi email thông báo từ chối tới ${params?.email ?? ""}`,
        "applications.rejectModal.selectTemplateLabel":
          "Chọn mẫu email từ chối",
        "applications.rejectModal.noEmailHint":
          "Ứng viên chưa có địa chỉ email nên không thể gửi email tự động.",
        "applications.rejectModal.confirmButton": "Xác nhận từ chối",
        "email.optRejection": "Từ chối",
        "email.selectTemplateOption": "Chọn mẫu email",
        "common.cancel": "Hủy",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("RejectApplicationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanViewEmail = false;
    mockTemplates = [];
    mockFlows = [];
  });

  it("defaults email checkbox to unchecked to prevent accidental emails", () => {
    render(
      <RejectApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        candidateName="Nguyen Van A"
        candidateEmail="vana@example.com"
        jobTitle="Backend Engineer"
      />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(
      screen.getByText(/Gửi email thông báo từ chối tới vana@example.com/),
    ).toBeInTheDocument();
  });

  it("submits trimmed rejectionReason and opted-in sendRejectionEmail=true", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);
    render(
      <RejectApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Nguyen Van A"
        candidateEmail="vana@example.com"
        jobTitle="Backend Engineer"
      />,
    );

    const textarea = screen.getByLabelText("Lý do từ chối (tùy chọn)");
    fireEvent.change(textarea, {
      target: { value: "  Thiếu kinh nghiệm Kubernetes  " },
    });

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận từ chối" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        rejectionReason: "Thiếu kinh nghiệm Kubernetes",
        sendRejectionEmail: true,
      });
    });
  });

  it("forces sendRejectionEmail=false and renders no-email hint when candidate has no email", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);
    render(
      <RejectApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Tran Thi B"
        candidateEmail={null}
        jobTitle="Designer"
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Ứng viên chưa có địa chỉ email nên không thể gửi email tự động.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận từ chối" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        rejectionReason: undefined,
        sendRejectionEmail: false,
      });
    });
  });

  it("shows template selector when email:view is granted and rejection email is checked, and forwards overridden emailTemplateId", async () => {
    mockCanViewEmail = true;
    mockTemplates = [
      {
        id: "tpl-rej-std",
        type: "REJECTION",
        name: "Từ chối tiêu chuẩn",
        subject: "Update",
        body: "<p>Sorry</p>",
        enabled: true,
        isSystem: true,
      },
      {
        id: "tpl-rej-keep",
        type: "REJECTION",
        name: "Giữ hồ sơ Talent Pool",
        subject: "Talent Pool",
        body: "<p>Keep in touch</p>",
        enabled: true,
        isSystem: false,
      },
    ];
    mockFlows = [
      {
        id: "flow-rej",
        flowKey: "APPLICATION_REJECTED",
        templateId: "tpl-rej-std",
        enabled: true,
        template: mockTemplates[0],
      },
    ];

    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);
    render(
      <RejectApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Nguyen Van C"
        candidateEmail="vanc@example.com"
        jobTitle="QA Engineer"
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(
      screen.getByText(/Từ chối tiêu chuẩn \(Từ chối\)/),
    ).toBeInTheDocument();

    const trigger = document.getElementById(
      "reject-email-template-select-trigger",
    );
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger!);
    fireEvent.click(
      await screen.findByText(/Giữ hồ sơ Talent Pool \(Từ chối\)/),
    );

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận từ chối" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        rejectionReason: undefined,
        sendRejectionEmail: true,
        emailTemplateId: "tpl-rej-keep",
      });
    });
  });
});
