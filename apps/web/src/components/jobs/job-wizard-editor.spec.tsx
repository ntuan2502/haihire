import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { JobWizardEditor } from "./job-wizard-editor";
import type { Job } from "@/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

let mockCreateIsPending = false;
let mockUpdateIsPending = false;
let mockDeleteIsPending = false;

vi.mock("@/hooks/use-queries", () => ({
  useCreateJobMutation: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: mockCreateIsPending,
  }),
  useUpdateJobMutation: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: mockUpdateIsPending,
  }),
  useDeleteJobMutation: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: mockDeleteIsPending,
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-test-1",
      email: "recruiter@haihire.com",
      organizationId: "org-test-1",
      organization: {
        id: "org-test-1",
        name: "Acme Corp",
      },
      role: "ADMIN",
    },
    canEdit: true,
  }),
}));

const mockInitialJob: Job = {
  id: "job-101",
  title: "Senior Frontend Engineer",
  department: "Product Engineering",
  location: "Da Nang, Vietnam",
  postalCode: "550000",
  type: "FULL_TIME",
  experienceLevel: "SENIOR_LEVEL",
  workplace: "HYBRID",
  status: "PUBLISHED",
  description:
    "Join our frontend core team building modern ATS web applications.",
  requirements: "React 19, TypeScript, Next.js, Tailwind CSS v4",
  salaryRange: "USD 2000 - 4000 / month",
  organizationId: "org-test-1",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-05T00:00:00.000Z",
};

describe("JobWizardEditor Component - Characterization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIsPending = false;
    mockUpdateIsPending = false;
    mockDeleteIsPending = false;
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // A.1.1: Rendering
  describe("A.1.1: Rendering", () => {
    it("renders wizard header with steps and back navigation", () => {
      render(<JobWizardEditor mode="create" />);

      // Wizard header steps
      expect(screen.getByText("Thông tin vị trí")).toBeInTheDocument();
      expect(screen.getByText("Biểu mẫu ứng tuyển")).toBeInTheDocument();
      expect(screen.getByText("Tiêu chí chấm điểm AI")).toBeInTheDocument();
      expect(screen.getByText("Xuất bản & Phân phối")).toBeInTheDocument();

      // Back navigation link to jobs list
      expect(screen.getByText("Tin tuyển dụng")).toBeInTheDocument();
    });

    it("displays current step indicator on step 1 with form fields", () => {
      render(<JobWizardEditor mode="create" />);

      // Step 1 Details form labels
      expect(screen.getByText("Chức danh công việc")).toBeInTheDocument();
      expect(screen.getByText("Địa điểm làm việc")).toBeInTheDocument();
      expect(screen.getByText("Mô tả công việc")).toBeInTheDocument();
      expect(screen.getByText("Hình thức làm việc")).toBeInTheDocument();
      expect(screen.getByText("Cấp bậc kinh nghiệm")).toBeInTheDocument();
      expect(screen.getByText("Mô hình làm việc")).toBeInTheDocument();
    });

    it("shows mobile sticky action bar with action buttons", () => {
      const { container } = render(<JobWizardEditor mode="create" />);

      const mobileBar = container.querySelector(".sm\\:hidden.fixed.bottom-0");
      expect(mobileBar).toBeInTheDocument();
    });
  });

  // A.1.2: Step Navigation
  describe("A.1.2: Step Navigation & Validation Gate", () => {
    it("moves to step 4 when continue is clicked with valid required fields", async () => {
      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // In initialJob, all required fields are pre-populated and valid
      const continueButtons = screen.getAllByRole("button", {
        name: /Lưu & tiếp tục/i,
      });
      const mainContinueBtn = continueButtons[0];
      fireEvent.click(mainContinueBtn);

      // Successfully navigated to Step 4 (Publish & Distribute)
      await waitFor(() => {
        expect(screen.getByText("Sẵn sàng đăng tuyển?")).toBeInTheDocument();
      });
    });

    it("shows validation error feedback and stays on step 1 when required fields are empty", () => {
      render(<JobWizardEditor mode="create" />);

      // Try to navigate to step 4 while fields are empty
      const step4Button = screen.getByRole("button", {
        name: /Xuất bản & Phân phối/i,
      });
      fireEvent.click(step4Button);

      // Validation errors become visible
      expect(
        screen.getByText("Vui lòng nhập chức danh công việc."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Vui lòng thêm địa điểm\/quốc gia/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Vui lòng chọn hình thức làm việc"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Vui lòng chọn cấp bậc kinh nghiệm"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Vui lòng chọn mô hình làm việc"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Vui lòng nhập mô tả công việc."),
      ).toBeInTheDocument();
    });

    it("navigates back to step 1 from step 4 using the back button", async () => {
      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // Go to step 4
      const continueBtn = screen.getAllByRole("button", {
        name: /Lưu & tiếp tục/i,
      })[0];
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText("Sẵn sàng đăng tuyển?")).toBeInTheDocument();
      });

      // Click "Quay lại" in step 4
      const backButtons = screen.getAllByRole("button", { name: /Quay lại/i });
      fireEvent.click(backButtons[0]);

      // Back on Step 1
      await waitFor(() => {
        expect(screen.getByText("Chức danh công việc")).toBeInTheDocument();
      });
    });

    it("does not navigate when clicking unimplemented steps in header", () => {
      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // Click on step 2 (Application Form, implemented: false)
      const step2Btn = screen.getByText("Biểu mẫu ứng tuyển");
      fireEvent.click(step2Btn);

      // Remains on Step 1
      expect(screen.getByText("Chức danh công việc")).toBeInTheDocument();
    });
  });

  // A.1.3: Draft Restoration
  describe("A.1.3: Draft Restoration", () => {
    it("restores draft data from localStorage on mount in create mode", () => {
      const savedDraft = {
        jobTitle: "Draft Cloud Architect",
        location: "Singapore",
        description: "Draft architecture overview",
        department: "Infrastructure",
        currentStep: 1,
        savedAt: Date.now() - 60000,
      };
      localStorage.setItem(
        "haihire_job_wizard_draft",
        JSON.stringify(savedDraft),
      );

      render(<JobWizardEditor mode="create" />);

      // Restore banner appears
      expect(
        screen.getByText(/Đã khôi phục bản nháp tự động lưu/i),
      ).toBeInTheDocument();
      // Fields are populated from draft
      expect(
        screen.getByDisplayValue("Draft Cloud Architect"),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("Singapore")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Draft architecture overview"),
      ).toBeInTheDocument();
    });

    it("clears draft from localStorage and resets form when discard is clicked", () => {
      const savedDraft = {
        jobTitle: "Temporary Title",
        location: "Hanoi",
        description: "Temp description",
        savedAt: Date.now(),
      };
      localStorage.setItem(
        "haihire_job_wizard_draft",
        JSON.stringify(savedDraft),
      );

      render(<JobWizardEditor mode="create" />);

      const discardBtn = screen.getByRole("button", { name: /Xóa bản nháp/i });
      fireEvent.click(discardBtn);

      // LocalStorage draft is removed
      expect(localStorage.getItem("haihire_job_wizard_draft")).toBeNull();
      // Form fields are cleared
      expect(screen.queryByDisplayValue("Temporary Title")).toBeNull();
      // Restore banner is removed
      expect(
        screen.queryByText(/Đã khôi phục bản nháp tự động lưu/i),
      ).toBeNull();
    });

    it("dismisses the draft banner when continue editing is clicked", () => {
      const savedDraft = {
        jobTitle: "Draft Lead",
        location: "Tokyo",
        description: "Draft desc",
        savedAt: Date.now(),
      };
      localStorage.setItem(
        "haihire_job_wizard_draft",
        JSON.stringify(savedDraft),
      );

      render(<JobWizardEditor mode="create" />);

      const continueEditBtn = screen.getByRole("button", {
        name: /Tiếp tục chỉnh sửa/i,
      });
      fireEvent.click(continueEditBtn);

      // Banner is dismissed, but fields remain populated
      expect(
        screen.queryByText(/Đã khôi phục bản nháp tự động lưu/i),
      ).toBeNull();
      expect(screen.getByDisplayValue("Draft Lead")).toBeInTheDocument();
    });
  });

  // A.1.4: Draft Auto-Save
  describe("A.1.4: Draft Auto-Save", () => {
    it("auto-saves modified fields to localStorage after 800ms debounce", () => {
      vi.useFakeTimers();

      render(<JobWizardEditor mode="create" />);

      const titleInput = screen.getByPlaceholderText(/Kỹ sư Frontend/i);
      fireEvent.change(titleInput, {
        target: { value: "Auto-Saved Job Title" },
      });

      // Before 800ms timer
      expect(localStorage.getItem("haihire_job_wizard_draft")).toBeNull();

      // Advance past 800ms debounce
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const storedRaw = localStorage.getItem("haihire_job_wizard_draft");
      expect(storedRaw).not.toBeNull();
      const stored = JSON.parse(storedRaw!);
      expect(stored.jobTitle).toBe("Auto-Saved Job Title");
    });

    it("does not auto-save draft to localStorage when in edit mode", () => {
      vi.useFakeTimers();

      render(<JobWizardEditor mode="edit" initialJob={mockInitialJob} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(localStorage.getItem("haihire_job_wizard_draft")).toBeNull();
    });
  });

  // A.1.5: ATS Preview Modal
  describe("A.1.5: ATS Preview Modal", () => {
    it("opens candidate ATS preview modal when preview button is clicked in header", () => {
      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      const previewBtn = screen.getByRole("button", { name: /Xem trước/i });
      fireEvent.click(previewBtn);

      // Preview modal rendered with job title
      expect(
        screen.getAllByText("Senior Frontend Engineer").length,
      ).toBeGreaterThan(0);
    });

    it("shows device preview switcher in the candidate ATS preview modal", () => {
      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      const previewBtn = screen.getByRole("button", { name: /Xem trước/i });
      fireEvent.click(previewBtn);

      // Desktop, tablet, mobile device switcher buttons
      expect(
        screen.getByRole("button", { name: /^Máy tính$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Máy tính bảng/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Điện thoại/i }),
      ).toBeInTheDocument();
    });
  });

  // A.1.6: Compensation & Salary Configuration
  describe("A.1.6: Compensation & Salary Configuration", () => {
    it("initializes compensation toggles and salary values from initialJob", () => {
      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // Salary parsed from "USD 2000 - 4000 / month"
      expect(screen.getByDisplayValue("2000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("4000")).toBeInTheDocument();
    });

    it("updates salary negotiable state when negotiable toggle is clicked", () => {
      render(<JobWizardEditor mode="create" />);

      // Open compensation accordion
      const compToggle = screen.getByText("Chế độ đãi ngộ & Mức lương");
      fireEvent.click(compToggle);

      const negotiableCheck = screen.getByLabelText(/Mức lương thỏa thuận/i);
      fireEvent.click(negotiableCheck);

      expect(negotiableCheck).toBeChecked();
    });
  });

  // A.1.7: Submission (Create & Edit Modes)
  describe("A.1.7: Submission", () => {
    it("calls useCreateJobMutation with status PUBLISHED on step 4 submit in create mode", async () => {
      mockCreateMutateAsync.mockResolvedValueOnce({ id: "job-new-1" });

      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // Navigate to step 4
      const continueBtn = screen.getAllByRole("button", {
        name: /Lưu & tiếp tục/i,
      })[0];
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText("Sẵn sàng đăng tuyển?")).toBeInTheDocument();
      });

      // Click "Đăng tuyển ngay"
      const publishButtons = screen.getAllByRole("button", {
        name: /Đăng tuyển ngay/i,
      });
      fireEvent.click(publishButtons[0]);

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Senior Frontend Engineer",
            department: "Product Engineering",
            location: "Da Nang, Vietnam",
            status: "PUBLISHED",
            type: "FULL_TIME",
            organizationId: "org-test-1",
          }),
        );
        expect(mockPush).toHaveBeenCalledWith("/dashboard/jobs");
      });
    });

    it("calls useCreateJobMutation with status DRAFT when draft mode is selected", async () => {
      mockCreateMutateAsync.mockResolvedValueOnce({ id: "job-new-draft" });

      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // Navigate to step 4
      const continueBtn = screen.getAllByRole("button", {
        name: /Lưu & tiếp tục/i,
      })[0];
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText("Sẵn sàng đăng tuyển?")).toBeInTheDocument();
      });

      // Select Draft radio option
      const draftOption = screen.getByText("Lưu bản nháp");
      fireEvent.click(draftOption);

      // Click "Lưu bản nháp" button
      const saveDraftButtons = screen.getAllByRole("button", {
        name: /Lưu bản nháp/i,
      });
      fireEvent.click(saveDraftButtons[0]);

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "DRAFT",
          }),
        );
      });
    });

    it("calls useUpdateJobMutation when saving changes in edit mode", async () => {
      mockUpdateMutateAsync.mockResolvedValueOnce({ id: "job-101" });

      render(<JobWizardEditor mode="edit" initialJob={mockInitialJob} />);

      // In edit mode, click Save Changes in header
      const saveBtn = screen.getByRole("button", { name: /Lưu thay đổi/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
        expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
          id: "job-101",
          data: expect.objectContaining({
            title: "Senior Frontend Engineer",
            department: "Product Engineering",
          }),
        });
      });
    });
  });

  // A.1.8: Error Handling & Deletion
  describe("A.1.8: Error Handling & Deletion", () => {
    it("displays error banner when job submission fails", async () => {
      mockCreateMutateAsync.mockRejectedValueOnce(
        new Error("Network connection error"),
      );

      render(<JobWizardEditor mode="create" initialJob={mockInitialJob} />);

      // Navigate to step 4
      const continueBtn = screen.getAllByRole("button", {
        name: /Lưu & tiếp tục/i,
      })[0];
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText("Sẵn sàng đăng tuyển?")).toBeInTheDocument();
      });

      const publishButtons = screen.getAllByRole("button", {
        name: /Đăng tuyển ngay/i,
      });
      fireEvent.click(publishButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/Không thể lưu vị trí tuyển dụng/i),
        ).toBeInTheDocument();
      });
    });

    it("opens delete confirmation modal and calls delete mutation in edit mode", async () => {
      mockDeleteMutateAsync.mockResolvedValueOnce(undefined);

      render(<JobWizardEditor mode="edit" initialJob={mockInitialJob} />);

      // Navigate to step 4
      const continueBtn = screen.getAllByRole("button", {
        name: /Lưu & tiếp tục/i,
      })[0];
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText("Xuất bản & Trạng thái")).toBeInTheDocument();
      });

      // Click delete button
      const deleteBtn = screen.getByRole("button", { name: /Xóa vị trí/i });
      fireEvent.click(deleteBtn);

      // Delete confirmation dialog is open
      expect(
        screen.getByText(/Bạn có chắc chắn muốn xóa/i),
      ).toBeInTheDocument();

      // Find confirmation input by id
      const confirmInput = document.getElementById(
        "confirm-destructive-input",
      ) as HTMLInputElement;
      expect(confirmInput).toBeInTheDocument();
      fireEvent.change(confirmInput, {
        target: { value: "Senior Frontend Engineer" },
      });

      const confirmDeleteBtn = screen.getByRole("button", {
        name: /Đồng ý, Xóa vị trí/i,
      });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith("job-101");
        expect(mockPush).toHaveBeenCalledWith("/dashboard/jobs");
      });
    });
  });
});
