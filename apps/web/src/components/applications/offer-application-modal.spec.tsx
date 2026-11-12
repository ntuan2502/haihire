import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OfferApplicationModal } from "./offer-application-modal";
import type { EmailFlowConfig, EmailTemplate } from "@/lib/email-templates";

let mockCanViewEmail = true;
let mockTemplates: EmailTemplate[] = [];
let mockFlows: EmailFlowConfig[] = [];

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanViewEmail,
}));

vi.mock("@/hooks/use-email-queries", () => ({
  useEmailTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useEmailFlows: () => ({ data: mockFlows, isLoading: false }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: { id: "u-1", organizationId: "org-1" } }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        "applications.offerModal.title": "Gửi thư đề nghị nhận việc",
        "applications.offerModal.description": `Chuyển ${params?.name ?? ""} sang Đề nghị nhận việc cho ${params?.job ?? ""}.`,
        "applications.offerModal.sendEmailLabel": `Gửi email đề nghị nhận việc tới ${params?.email ?? ""}`,
        "applications.offerModal.selectTemplateLabel": "Chọn mẫu email gửi kèm",
        "applications.offerModal.noEmailHint":
          "Ứng viên chưa có email nên không thể gửi tự động.",
        "applications.offerModal.confirmButton": "Xác nhận chuyển giai đoạn",
        "email.optOffer": "Đề nghị nhận việc",
        "email.selectTemplateOption": "Chọn mẫu email",
        "email.noActiveTemplates": "Chưa có mẫu email nào đang bật.",
        "common.cancel": "Hủy",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("OfferApplicationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanViewEmail = true;
    mockTemplates = [
      {
        id: "tpl-offer-std",
        type: "OFFER",
        name: "Offer Chuẩn",
        subject: "Offer {{job_title}}",
        body: "<p>Congrats</p>",
        enabled: true,
        isSystem: true,
      },
      {
        id: "tpl-offer-vip",
        type: "OFFER",
        name: "Offer Senior",
        subject: "Senior Offer {{job_title}}",
        body: "<p>Welcome Senior</p>",
        enabled: true,
        isSystem: false,
      },
    ];
    mockFlows = [
      {
        id: "flow-offer",
        flowKey: "APPLICATION_OFFER",
        templateId: "tpl-offer-std",
        enabled: true,
        template: mockTemplates[0],
      },
    ];
  });

  it("initializes send checkbox from APPLICATION_OFFER flow enabled state and submits default template", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <OfferApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Nguyen Van A"
        candidateEmail="vana@example.com"
        jobTitle="Backend Engineer"
      />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(
      screen.getByText(/Offer Chuẩn \(Đề nghị nhận việc\)/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận chuyển giai đoạn" }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        sendOfferEmail: true,
        emailTemplateId: "tpl-offer-std",
      });
    });
  });

  it("allows overriding the selected offer template before confirming", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <OfferApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Nguyen Van A"
        candidateEmail="vana@example.com"
        jobTitle="Backend Engineer"
      />,
    );

    const trigger = document.getElementById(
      "offer-email-template-select-trigger",
    );
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger!);

    const seniorOption = await screen.findByText(
      /Offer Senior \(Đề nghị nhận việc\)/,
    );
    fireEvent.click(seniorOption);

    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận chuyển giai đoạn" }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        sendOfferEmail: true,
        emailTemplateId: "tpl-offer-vip",
      });
    });
  });

  it("defaults checkbox to unchecked when APPLICATION_OFFER flow is disabled and omits emailTemplateId when unchecked", async () => {
    mockFlows = [
      {
        id: "flow-offer",
        flowKey: "APPLICATION_OFFER",
        templateId: "tpl-offer-std",
        enabled: false,
        template: mockTemplates[0],
      },
    ];
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <OfferApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Nguyen Van A"
        candidateEmail="vana@example.com"
        jobTitle="Backend Engineer"
      />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận chuyển giai đoạn" }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        sendOfferEmail: false,
      });
    });
  });

  it("forces sendOfferEmail=false when candidate has no email", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <OfferApplicationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        candidateName="Tran Thi B"
        candidateEmail={null}
        jobTitle="Designer"
      />,
    );

    expect(
      screen.getByText("Ứng viên chưa có email nên không thể gửi tự động."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận chuyển giai đoạn" }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        sendOfferEmail: false,
      });
    });
  });
});
