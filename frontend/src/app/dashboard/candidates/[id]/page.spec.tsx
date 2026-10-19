import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CandidateDetailPage from "./page";

const VALID_CANDIDATE_ID = "550e8400-e29b-41d4-a716-446655440000";
const mockPush = vi.fn();
const mockReplace = vi.fn();
let currentCandidateId: string = VALID_CANDIDATE_ID;
let mockCanEdit = true;

vi.mock("@/components/layout", () => ({
  Navbar: () => <div data-testid="mock-navbar" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => ({ id: currentCandidateId }),
  usePathname: () => `/dashboard/candidates/${currentCandidateId}`,
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
    title: "Senior Frontend Engineer",
    department: "Engineering",
    status: "PUBLISHED",
  },
  {
    id: "job-2",
    title: "Product Designer",
    department: "Design",
    status: "PUBLISHED",
  },
];

const defaultCandidateData = {
  id: VALID_CANDIDATE_ID,
  name: "Nguyen Van A",
  email: "nguyenvana@example.com",
  phone: "0901234567",
  gender: "MALE",
  dateOfBirth: "1995-05-15T00:00:00.000Z",
  notes: "Experienced full-stack engineer",
  resumeUrl: "https://minio.local/cv/nguyen-van-a.pdf",
  resumeFileName: "nguyen-van-a-cv.pdf",
  resumeFileSize: 102400,
  resumeMimeType: "application/pdf",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-02T10:00:00.000Z",
  applications: [
    {
      id: "app-1",
      candidateId: VALID_CANDIDATE_ID,
      jobId: "job-1",
      stage: "INTERVIEW",
      createdAt: "2026-03-01T10:00:00.000Z",
      notes: "Passed technical screening",
      job: {
        id: "job-1",
        title: "Senior Frontend Engineer",
        department: "Engineering",
      },
      interviews: [
        {
          id: "intv-1",
          applicationId: "app-1",
          title: "Technical Interview Round 1",
          scheduledAt: "2026-03-10T14:00:00.000Z",
          status: "SCHEDULED",
        },
      ],
    },
  ],
  allDocuments: [
    {
      id: "doc-1",
      name: "Nguyen_Van_A_Resume.pdf",
      url: "https://minio.local/cv/nguyen-van-a.pdf",
      type: "Resume",
      size: 102400,
      createdAt: "2026-03-01T10:00:00.000Z",
    },
  ],
};

let currentCandidate: typeof defaultCandidateData | null = {
  ...defaultCandidateData,
};
const mockUploadDocMutateAsync = vi.fn();
const mockDeleteCandidateMutateAsync = vi.fn();
const mockDeleteCandidateDocMutateAsync = vi.fn();
const mockDeleteAppDocMutateAsync = vi.fn();
const mockDeleteInterviewMutateAsync = vi.fn();
const mockSendEmailMutateAsync = vi.fn();

vi.mock("@/hooks/use-queries", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAllJobs: () => ({
      data: mockJobs,
      isLoading: false,
    }),
    useOpenJobs: () => ({
      data: mockJobs,
      isLoading: false,
    }),
    useCandidate: (id?: string | null) => ({
      data: id === VALID_CANDIDATE_ID ? currentCandidate : null,
      isLoading: false,
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
    useUploadCandidateDocumentMutation: () => ({
      mutateAsync: mockUploadDocMutateAsync,
      isPending: false,
    }),
    useDeleteCandidateMutation: () => ({
      mutateAsync: mockDeleteCandidateMutateAsync,
      isPending: false,
    }),
    useDeleteCandidateDocumentMutation: () => ({
      mutateAsync: mockDeleteCandidateDocMutateAsync,
      isPending: false,
    }),
    useDeleteDocumentMutation: () => ({
      mutateAsync: mockDeleteAppDocMutateAsync,
      isPending: false,
    }),
    useDeleteInterviewMutation: () => ({
      mutateAsync: mockDeleteInterviewMutateAsync,
      isPending: false,
    }),
    useCreateApplicationMutation: () => ({
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

describe("CandidateDetailPage Component - Characterization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentCandidateId = VALID_CANDIDATE_ID;
    mockCanEdit = true;
    currentCandidate = JSON.parse(JSON.stringify(defaultCandidateData));
  });

  // A.1.1: Rendering & Auth
  describe("A.1.1: Rendering & Auth", () => {
    it("renders 404 screen when candidate ID is an invalid UUID", () => {
      currentCandidateId = "invalid-uuid-format";

      renderWithClient(<CandidateDetailPage />);

      expect(screen.getByText("404")).toBeInTheDocument();
      expect(
        screen.getByText(
          "The candidate ID provided is invalid. A valid UUID is required.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Ứng viên/i }),
      ).toBeInTheDocument();
    });

    it("renders candidate detail when candidate ID is valid", () => {
      renderWithClient(<CandidateDetailPage />);

      expect(
        screen.getByRole("heading", { name: "Nguyen Van A" }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText("nguyenvana@example.com").length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText("0901234567").length).toBeGreaterThan(0);
    });

    it("hides edit, delete, and send email action buttons when canEdit is false", () => {
      mockCanEdit = false;

      renderWithClient(<CandidateDetailPage />);

      expect(
        screen.queryByRole("button", { name: /Gửi Email/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Chỉnh sửa|Sửa/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Xóa" }),
      ).not.toBeInTheDocument();
    });
  });

  // A.1.2: Header + Contact
  describe("A.1.2: Header + Contact", () => {
    it("displays candidate contact information with email and phone hyperlinks", () => {
      renderWithClient(<CandidateDetailPage />);

      const emailLink = screen.getByRole("link", {
        name: /nguyenvana@example.com/i,
      });
      expect(emailLink).toHaveAttribute(
        "href",
        "mailto:nguyenvana@example.com",
      );

      const phoneLink = screen.getByRole("link", { name: /0901234567/i });
      expect(phoneLink).toHaveAttribute("href", "tel:0901234567");
    });

    it("displays candidate personal details in the overview card", () => {
      renderWithClient(<CandidateDetailPage />);

      expect(screen.getByText("Tổng quan")).toBeInTheDocument();
      expect(screen.getByText("Nam")).toBeInTheDocument();
      expect(
        screen.getByText("Experienced full-stack engineer"),
      ).toBeInTheDocument();
    });

    it("displays candidate created and updated timestamps", () => {
      renderWithClient(<CandidateDetailPage />);

      expect(screen.getAllByText(/2026/i).length).toBeGreaterThan(0);
    });
  });

  // A.1.3: Applications tab
  describe("A.1.3: Applications tab", () => {
    it("lists candidate applications with job title and stage badge", () => {
      renderWithClient(<CandidateDetailPage />);

      expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
      expect(screen.getAllByText(/Phỏng vấn/i).length).toBeGreaterThan(0);
    });

    it("allows opening schedule interview modal for an application", () => {
      // Clear interviews on app-1 so the top schedule button appears
      if (currentCandidate?.applications[0]) {
        currentCandidate.applications[0].interviews = [];
      }

      renderWithClient(<CandidateDetailPage />);

      const scheduleBtn = screen.getByRole("button", {
        name: /Lên lịch phỏng vấn/i,
      });
      fireEvent.click(scheduleBtn);

      expect(
        screen.getByRole("heading", { name: /Lên lịch phỏng vấn/i }),
      ).toBeInTheDocument();
    });

    it("shows empty state when candidate has no applications", () => {
      if (currentCandidate) {
        currentCandidate.applications = [];
      }

      renderWithClient(<CandidateDetailPage />);

      expect(
        screen.getByText("Chưa có hồ sơ ứng tuyển nào của ứng viên này."),
      ).toBeInTheDocument();
    });
  });

  // A.1.4: Documents tab
  describe("A.1.4: Documents tab", () => {
    it("lists candidate documents when documents tab is clicked", () => {
      renderWithClient(<CandidateDetailPage />);

      const docsTab = screen.getByRole("button", { name: /Tài liệu/i });
      fireEvent.click(docsTab);

      expect(screen.getByText("Nguyen_Van_A_Resume.pdf")).toBeInTheDocument();
    });

    it("switches to PDF preview mode when clicking preview button", () => {
      renderWithClient(<CandidateDetailPage />);

      const docsTab = screen.getByRole("button", { name: /Tài liệu/i });
      fireEvent.click(docsTab);

      const previewBtn = screen.getByRole("button", { name: "Xem trước" });
      fireEvent.click(previewBtn);

      expect(screen.getByTitle("Nguyen_Van_A_Resume.pdf")).toBeInTheDocument();
    });

    it("shows empty state when candidate has no documents", () => {
      if (currentCandidate) {
        currentCandidate.allDocuments = [];
        currentCandidate.notes = "";
        currentCandidate.resumeUrl = "";
        currentCandidate.resumeFileName = "";
      }

      renderWithClient(<CandidateDetailPage />);

      const docsTab = screen.getByRole("button", { name: /Tài liệu/i });
      fireEvent.click(docsTab);

      expect(
        screen.getByText("Chưa có tài liệu đính kèm nào."),
      ).toBeInTheDocument();
    });
  });

  // A.1.5: PDF viewer
  describe("A.1.5: PDF viewer", () => {
    it("renders iframe pointing to document URL in preview mode", () => {
      renderWithClient(<CandidateDetailPage />);

      const docsTab = screen.getByRole("button", { name: /Tài liệu/i });
      fireEvent.click(docsTab);

      const previewBtn = screen.getByRole("button", { name: "Xem trước" });
      fireEvent.click(previewBtn);

      const iframe = screen.getByTitle("Nguyen_Van_A_Resume.pdf");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        expect.stringContaining("nguyen-van-a.pdf"),
      );
    });

    it("closes PDF viewer and returns to document list when clicking back", () => {
      renderWithClient(<CandidateDetailPage />);

      const docsTab = screen.getByRole("button", { name: /Tài liệu/i });
      fireEvent.click(docsTab);

      const previewBtn = screen.getByRole("button", { name: "Xem trước" });
      fireEvent.click(previewBtn);

      const backBtn = screen.getByRole("button", { name: "Quay lại" });
      fireEvent.click(backBtn);

      expect(
        screen.queryByTitle("Nguyen_Van_A_Resume.pdf"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Nguyen_Van_A_Resume.pdf")).toBeInTheDocument();
    });
  });

  // A.1.6: Activity timeline
  describe("A.1.6: Activity timeline", () => {
    it("renders activity timeline container", () => {
      renderWithClient(<CandidateDetailPage />);

      expect(
        screen.getByText("Dòng thời gian Hoạt động (Activity Timeline)"),
      ).toBeInTheDocument();
    });
  });

  // A.1.7: Modals
  describe("A.1.7: Modals", () => {
    it("opens send email modal when clicking Send Email button", () => {
      renderWithClient(<CandidateDetailPage />);

      const sendEmailBtn = screen.getByRole("button", { name: /Gửi Email/i });
      fireEvent.click(sendEmailBtn);

      expect(
        screen.getByRole("heading", { name: /Gửi Email cho ứng viên/i }),
      ).toBeInTheDocument();
    });

    it("opens apply to job modal when clicking Apply to Job button", () => {
      renderWithClient(<CandidateDetailPage />);

      const applyBtn = screen.getByRole("button", {
        name: /Ứng tuyển vào vị trí/i,
      });
      fireEvent.click(applyBtn);

      expect(
        screen.getByRole("heading", { name: "Ứng tuyển vào vị trí" }),
      ).toBeInTheDocument();
    });

    it("opens delete confirmation modal and triggers delete mutation on confirm", async () => {
      mockDeleteCandidateMutateAsync.mockResolvedValueOnce({ success: true });

      renderWithClient(<CandidateDetailPage />);

      const deleteBtn = screen.getByRole("button", { name: "Xóa" });
      fireEvent.click(deleteBtn);

      expect(
        screen.getByRole("heading", { name: "Xóa ứng viên" }),
      ).toBeInTheDocument();

      const confirmInput = document.getElementById(
        "confirm-destructive-input",
      ) as HTMLInputElement;
      expect(confirmInput).toBeInTheDocument();
      fireEvent.change(confirmInput, { target: { value: "Nguyen Van A" } });

      const form = confirmInput.closest("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockDeleteCandidateMutateAsync).toHaveBeenCalledWith(
          VALID_CANDIDATE_ID,
        );
      });
    });
  });
});
