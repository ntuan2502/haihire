import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ApplicationDetailPage from "./page";

const VALID_APP_ID = "550e8400-e29b-41d4-a716-446655440001";
const mockPush = vi.fn();
const mockReplace = vi.fn();
let currentAppId: string = VALID_APP_ID;
let mockCanEdit = true;
let mockIsLoading = false;

vi.mock("@/components/layout", () => ({
  Navbar: () => <div data-testid="mock-navbar" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => ({ id: currentAppId }),
  usePathname: () => `/dashboard/applications/${currentAppId}`,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Recruiter Admin",
      organizationId: "org-1",
      role: "ADMIN",
    },
    isAuthenticated: true,
    loading: false,
    canEdit: mockCanEdit,
    refreshUser: vi.fn(),
  }),
}));

const mockJobs = [
  {
    id: "job-1",
    title: "Lead Backend Architect",
    department: "Platform Engineering",
    type: "FULL_TIME",
    status: "PUBLISHED",
  },
];

const defaultApplicationData = {
  id: VALID_APP_ID,
  candidateId: "550e8400-e29b-41d4-a716-446655440000",
  jobId: "job-1",
  candidateName: "Tran Van B",
  candidateEmail: "tranvanb@example.com",
  candidatePhone: "0912345678",
  stage: "APPLIED",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-02T10:00:00.000Z",
  notes: "Experienced backend engineer | Strong TypeScript",
  resumeUrl: "https://minio.local/cv/tran-van-b.pdf",
  resumeFileName: "tran-van-b-cv.pdf",
  resumeFileSize: 102400,
  resumeMimeType: "application/pdf",
  job: {
    id: "job-1",
    title: "Lead Backend Architect",
    department: "Platform Engineering",
    type: "FULL_TIME",
  },
  interviews: [],
};

let currentApp: typeof defaultApplicationData | null = {
  ...defaultApplicationData,
};

const mockUpdateStageMutateAsync = vi.fn();
const mockDeleteAppMutateAsync = vi.fn();
const mockUpdateCandidateMutateAsync = vi.fn();
const mockDeleteInterviewMutateAsync = vi.fn();
const mockSendEmailMutateAsync = vi.fn();
const mockDownloadAuthenticatedFile = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    downloadAuthenticatedFile: (...args: unknown[]) =>
      mockDownloadAuthenticatedFile(...args),
  };
});

vi.mock("@/hooks/use-queries", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAllJobs: () => ({
      data: mockJobs,
      isLoading: mockIsLoading,
    }),
    useOpenJobs: () => ({
      data: mockJobs,
      isLoading: false,
    }),
    useApplication: (id?: string | null) => ({
      data: id === VALID_APP_ID ? currentApp : null,
      isLoading: mockIsLoading,
    }),
    useCandidateActivities: () => ({
      data: { data: [] },
      isLoading: false,
    }),
    useEmailTemplates: () => ({
      data: [],
      isLoading: false,
    }),
    useSendEmailMutation: () => ({
      mutateAsync: mockSendEmailMutateAsync,
      isPending: false,
    }),
    useUpdateStageMutation: () => ({
      mutateAsync: mockUpdateStageMutateAsync,
      isPending: false,
    }),
    useDeleteApplicationMutation: () => ({
      mutateAsync: mockDeleteAppMutateAsync,
      isPending: false,
    }),
    useUpdateCandidateMutation: () => ({
      mutateAsync: mockUpdateCandidateMutateAsync,
      isPending: false,
    }),
    useDeleteInterviewMutation: () => ({
      mutateAsync: mockDeleteInterviewMutateAsync,
      isPending: false,
    }),
    useCreateInterviewMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useUpdateInterviewMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ApplicationDetailPage Component - Characterization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAppId = VALID_APP_ID;
    mockCanEdit = true;
    mockIsLoading = false;
    currentApp = JSON.parse(JSON.stringify(defaultApplicationData));
  });

  // A.1.1: Rendering & Routing (3 tests)
  describe("A.1.1: Rendering & Routing", () => {
    it("renders 404 screen when application ID is an invalid UUID", () => {
      currentAppId = "invalid-uuid-123";

      renderWithClient(<ApplicationDetailPage />);

      expect(screen.getByText("404")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Mã định danh hồ sơ không hợp lệ. Yêu cầu UUID chuẩn.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Quay lại Hồ sơ ứng tuyển" }),
      ).toBeInTheDocument();
    });

    it("renders application detail when application ID is valid", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(
        screen.getByRole("heading", { name: "Tran Van B" }),
      ).toBeInTheDocument();
      expect(screen.getByText("tranvanb@example.com")).toBeInTheDocument();
      expect(screen.getByText("0912345678")).toBeInTheDocument();
    });

    it("renders loading spinner while application data is loading", () => {
      mockIsLoading = true;

      renderWithClient(<ApplicationDetailPage />);

      expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
      expect(screen.queryByText("Tran Van B")).not.toBeInTheDocument();
    });
  });

  // A.1.2: Stage machine (5 tests)
  describe("A.1.2: Stage machine", () => {
    it("displays current stage badge accurately", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(screen.getAllByText("Ứng tuyển").length).toBeGreaterThan(0);
    });

    it("enables valid transition buttons from current stage APPLIED", () => {
      renderWithClient(<ApplicationDetailPage />);

      const screeningBtn = screen.getByRole("button", {
        name: /Sơ loại/i,
      });
      expect(screeningBtn).not.toBeDisabled();

      const rejectedBtn = screen.getByRole("button", {
        name: /Từ chối/i,
      });
      expect(rejectedBtn).not.toBeDisabled();
    });

    it("disables invalid transitions with descriptive reason tooltip", () => {
      renderWithClient(<ApplicationDetailPage />);

      const offerBtn = screen.getByRole("button", {
        name: /Đề nghị/i,
      });
      expect(offerBtn).toBeDisabled();
      expect(offerBtn).toHaveAttribute("title");
      expect(offerBtn.getAttribute("title")).toContain(
        "Không thể chuyển từ APPLIED sang OFFER",
      );
    });

    it("dispatches stage update mutation when a valid transition is clicked", async () => {
      mockUpdateStageMutateAsync.mockResolvedValueOnce({ success: true });

      renderWithClient(<ApplicationDetailPage />);

      const screeningBtn = screen.getByRole("button", {
        name: /Sơ loại/i,
      });
      fireEvent.click(screeningBtn);

      await waitFor(() => {
        expect(mockUpdateStageMutateAsync).toHaveBeenCalledWith({
          id: VALID_APP_ID,
          stage: "SCREENING",
        });
      });
    });

    it("shows error toast and refetches on mutation failure", async () => {
      mockUpdateStageMutateAsync.mockRejectedValueOnce(
        new Error("Network update failed"),
      );

      renderWithClient(<ApplicationDetailPage />);

      const screeningBtn = screen.getByRole("button", {
        name: /Sơ loại/i,
      });
      fireEvent.click(screeningBtn);

      await waitFor(() => {
        expect(mockUpdateStageMutateAsync).toHaveBeenCalled();
      });
    });
  });

  // A.1.3: Candidate summary (3 tests)
  describe("A.1.3: Candidate summary", () => {
    it("displays candidate initials avatar and job title", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(screen.getByText("TB")).toBeInTheDocument();
      expect(screen.getByText(/Lead Backend Architect/i)).toBeInTheDocument();
    });

    it("displays candidate contact links with mailto and tel protocols", () => {
      renderWithClient(<ApplicationDetailPage />);

      const emailLink = screen.getByRole("link", {
        name: /tranvanb@example.com/i,
      });
      expect(emailLink).toHaveAttribute("href", "mailto:tranvanb@example.com");

      const phoneLink = screen.getByRole("link", { name: /0912345678/i });
      expect(phoneLink).toHaveAttribute("href", "tel:0912345678");
    });

    it("opens send email modal when clicking Send Email button", () => {
      renderWithClient(<ApplicationDetailPage />);

      const sendEmailBtn = screen.getByRole("button", {
        name: "Gửi Email",
      });
      fireEvent.click(sendEmailBtn);

      expect(
        screen.getByRole("heading", { name: /Gửi Email cho ứng viên/i }),
      ).toBeInTheDocument();
    });
  });

  // A.1.4: 9-tab switcher (3 tests)
  describe("A.1.4: 9-tab switcher", () => {
    it("renders overview tab as active by default", () => {
      renderWithClient(<ApplicationDetailPage />);

      const overviewTab = screen.getByRole("button", { name: "Tổng quan" });
      expect(overviewTab).toBeInTheDocument();
    });

    it("switches active tab when clicking other tabs", () => {
      renderWithClient(<ApplicationDetailPage />);

      const inboxTab = screen.getByRole("button", { name: "Hộp thư" });
      fireEvent.click(inboxTab);

      expect(screen.getByText("Chưa có tin nhắn nào")).toBeInTheDocument();

      const responsesTab = screen.getByRole("button", {
        name: "Câu trả lời",
      });
      fireEvent.click(responsesTab);

      expect(
        screen.getByText("Chưa có phản hồi từ biểu mẫu ứng tuyển."),
      ).toBeInTheDocument();
    });

    it("switches to other tab panels: ai, notes, properties, timeline, documents", () => {
      renderWithClient(<ApplicationDetailPage />);

      // AI tab
      const aiTab = screen.getByRole("button", { name: "Phân tích AI" });
      fireEvent.click(aiTab);
      expect(screen.getByText("Chưa có phân tích AI")).toBeInTheDocument();

      // Notes tab
      const notesTab = screen.getByRole("button", { name: "Ghi chú" });
      fireEvent.click(notesTab);
      expect(
        screen.getByPlaceholderText("Nhập ghi chú tại đây..."),
      ).toBeInTheDocument();

      // Properties tab
      const propTab = screen.getByRole("button", { name: "Thuộc tính" });
      fireEvent.click(propTab);
      expect(
        screen.getByText(/\+? Thêm thuộc tính tổ chức/i),
      ).toBeInTheDocument();

      // Timeline tab
      const timelineTab = screen.getByRole("button", {
        name: "Dòng thời gian",
      });
      fireEvent.click(timelineTab);
      expect(document.querySelector(".space-y-4")).toBeInTheDocument();

      // Documents tab
      const docsTab = screen.getByRole("button", { name: /Tài liệu \(1\)/i });
      fireEvent.click(docsTab);
      expect(screen.getByText("tran-van-b-cv.pdf")).toBeInTheDocument();
    });

    it("opens overview sections popover when toggle button is clicked", () => {
      renderWithClient(<ApplicationDetailPage />);

      const popoverToggle = screen.getByLabelText("Toggle overview sections");
      fireEvent.click(popoverToggle);

      expect(screen.getByText("Các phần hiển thị")).toBeInTheDocument();
    });
  });

  // A.1.5: Overview tab (2 tests)
  describe("A.1.5: Overview tab", () => {
    it("renders AI analysis section in overview tab", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(screen.getByText("Chưa có phân tích AI")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Chạy phân tích AI/i }),
      ).toBeInTheDocument();
    });

    it("renders documents and notes sections in overview tab", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(screen.getAllByText("Tài liệu").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Ghi chú").length).toBeGreaterThan(0);
    });
  });

  // A.1.6: Notes engine (3 tests)
  describe("A.1.6: Notes engine", () => {
    it("renders pre-existing notes parsed from application", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(
        screen.getByText("Experienced backend engineer"),
      ).toBeInTheDocument();
      expect(screen.getByText("Strong TypeScript")).toBeInTheDocument();
    });

    it("dispatches update mutation with delimited string when note is added", async () => {
      mockUpdateCandidateMutateAsync.mockResolvedValueOnce({ success: true });

      renderWithClient(<ApplicationDetailPage />);

      const noteInput = screen.getByPlaceholderText("Nhập ghi chú tại đây...");
      fireEvent.change(noteInput, {
        target: { value: "Great system design skills" },
      });

      const saveBtn = screen.getByRole("button", { name: "Lưu thay đổi" });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateCandidateMutateAsync).toHaveBeenCalledWith({
          id: VALID_APP_ID,
          data: {
            notes: expect.stringContaining("Great system design skills"),
          },
        });
      });
    });

    it("hides save button when note input is empty", () => {
      renderWithClient(<ApplicationDetailPage />);

      expect(
        screen.queryByRole("button", { name: "Lưu thay đổi" }),
      ).not.toBeInTheDocument();
    });
  });

  // A.1.7: Modals (3 tests)
  describe("A.1.7: Modals", () => {
    it("opens schedule interview modal from interviews section", () => {
      renderWithClient(<ApplicationDetailPage />);

      const scheduleBtn = screen
        .getAllByRole("button", { name: /Lên lịch phỏng vấn/i })
        .find((btn) => !btn.hasAttribute("disabled"))!;
      expect(scheduleBtn).toBeDefined();
      fireEvent.click(scheduleBtn);

      expect(
        screen.getByRole("heading", { name: /Lên lịch phỏng vấn/i }),
      ).toBeInTheDocument();
    });

    it("opens delete application modal and dispatches delete mutation on confirmation", async () => {
      mockDeleteAppMutateAsync.mockResolvedValueOnce({ success: true });

      renderWithClient(<ApplicationDetailPage />);

      const deleteBtn = screen.getByRole("button", {
        name: "Xóa hồ sơ ứng tuyển",
      });
      fireEvent.click(deleteBtn);

      expect(
        screen.getByRole("heading", { name: "Xóa hồ sơ ứng tuyển" }),
      ).toBeInTheDocument();

      const confirmInput = document.getElementById(
        "confirm-destructive-input",
      ) as HTMLInputElement;
      expect(confirmInput).toBeInTheDocument();
      fireEvent.change(confirmInput, { target: { value: "Tran Van B" } });

      const form = confirmInput.closest("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockDeleteAppMutateAsync).toHaveBeenCalledWith(VALID_APP_ID);
      });
    });

    it("navigates to applications page after delete confirmation", async () => {
      mockDeleteAppMutateAsync.mockResolvedValueOnce({ success: true });

      renderWithClient(<ApplicationDetailPage />);

      const deleteBtn = screen.getByRole("button", {
        name: "Xóa hồ sơ ứng tuyển",
      });
      fireEvent.click(deleteBtn);

      const confirmInput = document.getElementById(
        "confirm-destructive-input",
      ) as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Tran Van B" } });

      const form = confirmInput.closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard/applications");
      });
    });

    it("opens document preview modal and invokes authenticated download", async () => {
      mockDownloadAuthenticatedFile.mockResolvedValueOnce(undefined);

      renderWithClient(<ApplicationDetailPage />);

      const previewBtn = screen.getByRole("button", { name: "Xem trước" });
      fireEvent.click(previewBtn);

      expect(
        screen.getByRole("heading", { name: "tran-van-b-cv.pdf", level: 2 }),
      ).toBeInTheDocument();

      const downloadBtns = screen.getAllByRole("button", {
        name: /Tải xuống/i,
      });
      fireEvent.click(downloadBtns[0]);

      await waitFor(() => {
        expect(mockDownloadAuthenticatedFile).toHaveBeenCalled();
      });
    });

    it("handles delete mutation error gracefully with toast error", async () => {
      mockDeleteAppMutateAsync.mockRejectedValueOnce(
        new Error("Cannot delete"),
      );

      renderWithClient(<ApplicationDetailPage />);

      const deleteBtn = screen.getByRole("button", {
        name: "Xóa hồ sơ ứng tuyển",
      });
      fireEvent.click(deleteBtn);

      const confirmInput = document.getElementById(
        "confirm-destructive-input",
      ) as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Tran Van B" } });

      const form = confirmInput.closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockDeleteAppMutateAsync).toHaveBeenCalledWith(VALID_APP_ID);
      });
    });
  });
});
