import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmailTemplatesSettingsPage from "./page";
import type { EmailFlowConfig, EmailTemplate } from "@/lib/email-templates";

const mockCreateTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDuplicateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();
const mockUpdateFlow = vi.fn();

let mockTemplates: EmailTemplate[] = [];
let mockFlows: EmailFlowConfig[] = [];

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/hooks/use-queries", () => ({
  useEmailTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useEmailFlows: () => ({ data: mockFlows, isLoading: false }),
  useEmailSettings: () => ({
    data: {
      provider: "SIMULATED",
      fromName: "HaiHire Team",
      fromEmail: "hr@haihire.vn",
    },
  }),
  useCreateEmailTemplateMutation: () => ({
    mutateAsync: mockCreateTemplate,
    isPending: false,
  }),
  useUpdateEmailTemplateMutation: () => ({
    mutateAsync: mockUpdateTemplate,
    isPending: false,
  }),
  useDuplicateEmailTemplateMutation: () => ({
    mutateAsync: mockDuplicateTemplate,
    isPending: false,
  }),
  useDeleteEmailTemplateMutation: () => ({
    mutateAsync: mockDeleteTemplate,
    isPending: false,
  }),
  useUpdateEmailFlowMutation: () => ({
    mutateAsync: mockUpdateFlow,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        "email.flowsSectionTitle": "Luồng gửi Email tự động",
        "email.flowsSectionDesc": "Gán mẫu vào 4 luồng chính",
        "email.flowApplicationReceivedTitle": "Xác nhận nộp hồ sơ",
        "email.flowApplicationReceivedDesc": "Gửi khi ứng viên nộp CV",
        "email.flowInterviewScheduledTitle": "Mời phỏng vấn",
        "email.flowInterviewScheduledDesc": "Gửi khi tạo lịch",
        "email.flowApplicationRejectedTitle": "Thông báo từ chối",
        "email.flowApplicationRejectedDesc": "Gửi khi chuyển sang Từ chối",
        "email.flowApplicationOfferTitle": "Thư đề nghị nhận việc",
        "email.flowApplicationOfferDesc": "Gửi khi chuyển sang Offer",
        "email.flowAutoEnabled": "Tự động bật",
        "email.flowAutoDisabled": "Đang tắt",
        "email.flowUnassigned": "Chưa gán mẫu",
        "email.libraryTitle": "Thư viện mẫu Email",
        "email.libraryDesc": "Quản lý mẫu",
        "email.newTemplateBtn": "Tạo mẫu mới",
        "email.createModalTitle": "Tạo mẫu Email mới",
        "email.templateTitleLabel": "Tên mẫu",
        "email.templateTitlePlaceholder": "Nhập tên mẫu",
        "email.templateCategoryLabel": "Phân loại",
        "email.templateEnabledLabel": "Kích hoạt mẫu",
        "email.subject": "Tiêu đề",
        "email.body": "Nội dung",
        "email.systemBadge": "Hệ thống",
        "email.customBadge": "Tùy chỉnh",
        "email.systemProtectedHint":
          "Mẫu mặc định của hệ thống được bảo vệ khỏi thao tác xóa.",
        "email.deleteBtn": "Xóa mẫu",
        "email.deleteConfirmTitle": "Xóa mẫu Email",
        "email.deleteConfirmDesc": `Bạn muốn xóa mẫu ${params?.name ?? ""}?`,
        "email.deleteConfirmAssignedWarning": `Đang gán vào luồng: ${params?.flows ?? ""}`,
        "email.duplicateBtn": "Nhân bản",
        "email.copySuffix": "Bản sao",
        "email.statusEnabled": "Đang bật",
        "email.statusDisabled": "Đang tắt",
        "email.assignedFlowsLabel": "Đang dùng ở luồng:",
        "email.optApplicationConfirmation": "Xác nhận ứng tuyển",
        "email.optInterviewInvitation": "Mời phỏng vấn",
        "email.optRejection": "Từ chối",
        "email.optOffer": "Đề nghị nhận việc",
        "email.optCustom": "Tùy chỉnh",
        "email.saveTemplate": "Lưu mẫu",
        "email.livePreview": "Xem trước",
        "common.cancel": "Hủy",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("EmailTemplatesSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sysTemplate: EmailTemplate = {
      id: "uuid-sys-1",
      type: "APPLICATION_CONFIRMATION",
      name: "Mẫu xác nhận mặc định",
      subject: "Đã nhận hồ sơ {{job_title}}",
      body: "<p>Cảm ơn {{candidate_name}}</p>",
      enabled: true,
      isSystem: true,
    };
    const customOfferTemplate: EmailTemplate = {
      id: "uuid-cust-2",
      type: "OFFER",
      name: "Thư mời Tech Lead",
      subject: "Offer {{job_title}}",
      body: "<p>Chào mừng {{candidate_name}}</p>",
      enabled: true,
      isSystem: false,
    };
    mockTemplates = [sysTemplate, customOfferTemplate];
    mockFlows = [
      {
        id: "f-1",
        flowKey: "APPLICATION_RECEIVED",
        templateId: sysTemplate.id,
        enabled: true,
        template: sysTemplate,
      },
      {
        id: "f-2",
        flowKey: "INTERVIEW_SCHEDULED",
        templateId: null,
        enabled: false,
        template: null,
      },
      {
        id: "f-3",
        flowKey: "APPLICATION_REJECTED",
        templateId: null,
        enabled: false,
        template: null,
      },
      {
        id: "f-4",
        flowKey: "APPLICATION_OFFER",
        templateId: customOfferTemplate.id,
        enabled: true,
        template: customOfferTemplate,
      },
    ];
    mockCreateTemplate.mockResolvedValue({
      ...customOfferTemplate,
      id: "uuid-created-3",
      name: "Mẫu Phỏng Vấn Vòng 2",
      type: "INTERVIEW_INVITATION",
    });
    mockDuplicateTemplate.mockResolvedValue({
      ...sysTemplate,
      id: "uuid-dup-4",
      name: "Mẫu xác nhận mặc định (Bản sao)",
      isSystem: false,
    });
    mockDeleteTemplate.mockResolvedValue({ deleted: true, id: "uuid-cust-2" });
    mockUpdateFlow.mockResolvedValue(mockFlows[0]);
  });

  it("renders all 4 email flow cards, protects isSystem template from deletion, and supports flow toggling", async () => {
    render(<EmailTemplatesSettingsPage />);

    // 4 flow titles present
    expect(screen.getAllByText("Xác nhận nộp hồ sơ").length).toBeGreaterThan(0);
    expect(screen.getByText("Mời phỏng vấn")).toBeInTheDocument();
    expect(screen.getByText("Thông báo từ chối")).toBeInTheDocument();
    expect(screen.getAllByText("Thư đề nghị nhận việc").length).toBeGreaterThan(
      0,
    );

    // Initially selects system template: shows protected hint & hides Delete button
    expect(
      screen.getByText(
        "Mẫu mặc định của hệ thống được bảo vệ khỏi thao tác xóa.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Xóa mẫu" }),
    ).not.toBeInTheDocument();

    // Toggle APPLICATION_RECEIVED flow checkbox
    const flowCheckbox = screen.getByRole("checkbox", {
      name: "Xác nhận nộp hồ sơ",
    });
    fireEvent.click(flowCheckbox);

    await waitFor(() => {
      expect(mockUpdateFlow).toHaveBeenCalledWith({
        flowKey: "APPLICATION_RECEIVED",
        data: { enabled: false },
      });
    });
  });

  it("creates a custom template via modal, duplicates a template, and warns bound flows when deleting a custom template", async () => {
    render(<EmailTemplatesSettingsPage />);

    // Duplicate first template from sidebar button
    const dupBtns = screen.getAllByRole("button", { name: "Nhân bản" });
    fireEvent.click(dupBtns[0]);
    await waitFor(() => {
      expect(mockDuplicateTemplate).toHaveBeenCalledWith({
        id: "uuid-sys-1",
        name: "Mẫu xác nhận mặc định (Bản sao)",
      });
    });

    // Open Create Modal and submit a new template
    fireEvent.click(screen.getByRole("button", { name: "Tạo mẫu mới" }));
    const titleInput = document.getElementById("new-template-name");
    expect(titleInput).toBeTruthy();
    fireEvent.change(titleInput!, {
      target: { value: "Mẫu Phỏng Vấn Vòng 2" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Tạo mẫu mới" })[1]);

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Mẫu Phỏng Vấn Vòng 2",
        }),
      );
      expect(screen.getByText("email.createSuccess")).toBeInTheDocument();
      expect(
        document.getElementById("new-template-name"),
      ).not.toBeInTheDocument();
    });

    // Select custom template bound to APPLICATION_OFFER and trigger Delete modal with flow warning
    fireEvent.click(screen.getByText("Thư mời Tech Lead"));
    const deleteBtn = await screen.findByRole("button", { name: "Xóa mẫu" });
    fireEvent.click(deleteBtn);

    expect(
      screen.getByText(/Đang gán vào luồng: Thư đề nghị nhận việc/),
    ).toBeInTheDocument();

    const confirmDeleteBtns = screen.getAllByRole("button", {
      name: "Xóa mẫu",
    });
    fireEvent.click(confirmDeleteBtns[confirmDeleteBtns.length - 1]);

    await waitFor(() => {
      expect(mockDeleteTemplate).toHaveBeenCalledWith("uuid-cust-2");
    });
  });
});
