import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RejectApplicationModal } from "./reject-application-modal";

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
        "applications.rejectModal.noEmailHint":
          "Ứng viên chưa có địa chỉ email nên không thể gửi email tự động.",
        "applications.rejectModal.confirmButton": "Xác nhận từ chối",
        "common.cancel": "Hủy",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("RejectApplicationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
