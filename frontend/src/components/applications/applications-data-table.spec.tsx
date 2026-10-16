import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApplicationsDataTable } from "./applications-data-table";
import type { Job, Application } from "@/types";
import { en } from "@/i18n/locales/en";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

function resolveKey(path: string, obj: Record<string, unknown>): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return path;
  }
  return typeof cur === "string" ? cur : path;
}

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      let val = resolveKey(key, en);
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@example.com", organizationId: "org-1" },
    canEdit: true,
  }),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

const mockDownloadAuthenticatedFile = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/api", () => ({
  downloadAuthenticatedFile: (...args: unknown[]) =>
    mockDownloadAuthenticatedFile(...args),
  getDocumentUrl: (url: string) => url,
}));

const mockUpdateStage = vi.fn().mockResolvedValue({ id: "app-1", stage: "INTERVIEW" });
const mockDeleteApp = vi.fn().mockResolvedValue({ success: true });
const mockUpdateCandidate = vi.fn().mockResolvedValue({ id: "app-1" });
const mockDeleteInterview = vi.fn().mockResolvedValue({ success: true });
const mockCreateInterview = vi.fn().mockResolvedValue({ id: "intv-new" });
const mockUpdateInterview = vi.fn().mockResolvedValue({ id: "intv-1" });

vi.mock("@/hooks/use-queries", () => ({
  useUpdateStageMutation: () => ({
    mutateAsync: mockUpdateStage,
    isPending: false,
  }),
  useDeleteApplicationMutation: () => ({
    mutateAsync: mockDeleteApp,
    isPending: false,
  }),
  useUpdateCandidateMutation: () => ({
    mutateAsync: mockUpdateCandidate,
    isPending: false,
  }),
  useDeleteInterviewMutation: () => ({
    mutateAsync: mockDeleteInterview,
    isPending: false,
  }),
  useCreateInterviewMutation: () => ({
    mutateAsync: mockCreateInterview,
    isPending: false,
  }),
  useUpdateInterviewMutation: () => ({
    mutateAsync: mockUpdateInterview,
    isPending: false,
  }),
  useOrgMembers: () => ({
    data: [
      { id: "mem-1", role: "ADMIN", user: { id: "u-1", name: "Alice Recruiter", email: "alice@test.com" } },
    ],
    isLoading: false,
  }),
}));

const mockJobs: Job[] = [
  {
    id: "job-1",
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Hanoi",
    type: "FULL_TIME",
    experienceLevel: "SENIOR_LEVEL",
    workplace: "HYBRID",
    status: "PUBLISHED",
    description: "Build scalable web applications",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "job-2",
    title: "Product Designer",
    department: "Design",
    location: "Ho Chi Minh City",
    type: "PART_TIME",
    experienceLevel: "MID_LEVEL",
    workplace: "REMOTE",
    status: "PUBLISHED",
    description: "Design intuitive interfaces",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const mockApplications: Application[] = [
  {
    id: "app-1",
    jobId: "job-1",
    candidateName: "Nguyen Van An",
    candidateEmail: "an.nguyen@example.com",
    candidatePhone: "+84901234567",
    stage: "APPLIED",
    matchScore: 85,
    orderIndex: 0,
    notes: "Top candidate from referral | Speaks fluent English",
    resumeUrl: "https://minio.haihire.vn/resumes/an.pdf",
    resumeFileName: "Nguyen_Van_An_CV.pdf",
    resumeFileSize: 102400,
    resumeMimeType: "application/pdf",
    interviews: [
      {
        id: "intv-1",
        applicationId: "app-1",
        round: "Technical Interview",
        scheduledAt: "2026-10-20T10:00:00.000Z",
        status: "SCHEDULED",
        interviewer: "Alice Recruiter",
      },
    ],
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "app-2",
    jobId: "job-2",
    candidateName: "Tran Thi Binh",
    candidateEmail: "binh.tran@example.com",
    candidatePhone: "+84912345678",
    stage: "SCREENING",
    matchScore: 70,
    orderIndex: 1,
    notes: "Strong UI portfolio",
    createdAt: "2026-01-12T14:00:00.000Z",
    updatedAt: "2026-01-12T14:00:00.000Z",
  },
  {
    id: "app-3",
    jobId: "job-1",
    candidateName: "Le Van Cuong",
    candidateEmail: "cuong.le@example.com",
    candidatePhone: "+84923456789",
    stage: "OFFER",
    matchScore: 92,
    orderIndex: 2,
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
  },
];

describe("ApplicationsDataTable Component", () => {
  let queryClient: QueryClient;

  function renderTable(props: Partial<Parameters<typeof ApplicationsDataTable>[0]> = {}) {
    return render(
      <QueryClientProvider client={queryClient}>
        <ApplicationsDataTable
          applications={mockApplications}
          jobs={mockJobs}
          loading={false}
          {...props}
        />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  // B.3.1: Table Rendering (5 tests)
  describe("1. Rendering & Layout", () => {
    it("renders applications table headers and rows", () => {
      renderTable();
      const table = screen.getByRole("table");
      expect(within(table).getByText("Candidate")).toBeInTheDocument();
      expect(within(table).getByText("Email")).toBeInTheDocument();
      expect(within(table).getByText("Job")).toBeInTheDocument();
      expect(within(table).getByText("Status")).toBeInTheDocument();
      expect(within(table).getByText("Score")).toBeInTheDocument();
      expect(within(table).getByText("Applied")).toBeInTheDocument();
      expect(within(table).getByText("Actions")).toBeInTheDocument();

      expect(screen.getByText("Nguyen Van An")).toBeInTheDocument();
      expect(screen.getByText("Tran Thi Binh")).toBeInTheDocument();
      expect(screen.getByText("Le Van Cuong")).toBeInTheDocument();
    });

    it("displays candidate name, email, and associated job title", () => {
      renderTable();
      expect(screen.getByText("an.nguyen@example.com")).toBeInTheDocument();
      expect(screen.getByText("binh.tran@example.com")).toBeInTheDocument();
      expect(screen.getAllByText(/Senior Full-Stack Engineer/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Product Designer/)).toBeInTheDocument();
    });

    it("displays stage badge and status indicator", () => {
      renderTable();
      // Table rows display stage status label: New (for APPLIED), Screening, Offer
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getAllByText("Screening").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Offer").length).toBeGreaterThan(0);
    });

    it("displays total count and pagination footer", () => {
      renderTable({ totalCount: 3 });
      expect(screen.getByText(/Showing 1–3 of 3 applications/i)).toBeInTheDocument();
    });

    it("shows empty state when no applications exist", () => {
      renderTable({ applications: [] });
      expect(screen.getByText("No applications yet")).toBeInTheDocument();
      const viewJobsBtn = screen.getByRole("button", { name: "View Active Jobs" });
      expect(viewJobsBtn).toBeInTheDocument();
      fireEvent.click(viewJobsBtn);
      expect(mockPush).toHaveBeenCalledWith("/dashboard/jobs");
    });
  });

  // B.3.2: Sorting (4 tests)
  describe("2. Sorting Behavior", () => {
    it("sorts by candidate name ascending and descending", () => {
      renderTable();
      const table = screen.getByRole("table");
      const candidateHeader = within(table).getByText("Candidate");

      // First click: asc -> Le Van Cuong, Nguyen Van An, Tran Thi Binh
      fireEvent.click(candidateHeader);
      let rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Le Van Cuong");

      // Second click: desc -> Tran Thi Binh, Nguyen Van An, Le Van Cuong
      fireEvent.click(candidateHeader);
      rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Tran Thi Binh");
    });

    it("sorts by email column", () => {
      renderTable();
      const table = screen.getByRole("table");
      const emailHeader = within(table).getByText("Email");
      fireEvent.click(emailHeader); // asc: an.nguyen
      let rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("an.nguyen@example.com");

      fireEvent.click(emailHeader); // desc: cuong.le
      rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("cuong.le@example.com");
    });

    it("sorts by job title", () => {
      renderTable();
      const table = screen.getByRole("table");
      const jobHeader = within(table).getByText("Job");
      fireEvent.click(jobHeader); // asc: Product Designer (Tran Thi Binh)
      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Product Designer");
    });

    it("sorts by applied date default descending", () => {
      renderTable();
      const table = screen.getByRole("table");
      const appliedHeader = within(table).getByText("Applied");
      // Default is desc: app-3 (Jan 15) is first
      let rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Le Van Cuong");

      // Click toggles to asc: app-1 (Jan 10) is first
      fireEvent.click(appliedHeader);
      rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Nguyen Van An");
    });
  });

  // B.3.3: Column Visibility (2 tests)
  describe("3. Column Visibility Dropdown", () => {
    it("opens columns dropdown and allows toggling column visibility", () => {
      renderTable();
      const columnsBtn = screen.getByRole("button", { name: /columns/i });
      fireEvent.click(columnsBtn);

      expect(screen.getByText("TOGGLE COLUMNS")).toBeInTheDocument();
      const emailCheckbox = screen.getByLabelText("Email");
      expect(emailCheckbox).toBeChecked();

      // Toggle email off
      fireEvent.click(emailCheckbox);
      const table = screen.getByRole("table");
      expect(within(table).queryByText("Email")).not.toBeInTheDocument();
    });

    it("prevents unchecking locked candidate column", () => {
      renderTable();
      const columnsBtn = screen.getByRole("button", { name: /columns/i });
      fireEvent.click(columnsBtn);

      const candidateCheckbox = screen.getByLabelText("Candidate");
      expect(candidateCheckbox).toBeDisabled();
    });
  });

  // B.3.4: Filters (4 tests)
  describe("4. Filtering & Search", () => {
    it("filters applications by search input text across name and email", async () => {
      renderTable();
      const searchInput = screen.getByPlaceholderText(
        "Search applications by candidate name or email...",
      );
      fireEvent.change(searchInput, { target: { value: "cuong" } });

      await waitFor(() => {
        expect(screen.getByText("Le Van Cuong")).toBeInTheDocument();
        expect(screen.queryByText("Nguyen Van An")).not.toBeInTheDocument();
        expect(screen.queryByText("Tran Thi Binh")).not.toBeInTheDocument();
      });
    });

    it("toggles stage filter in SegmentedTabs", () => {
      renderTable();
      const appliedTab = screen.getByRole("button", { name: /^applied/i });
      fireEvent.click(appliedTab);

      // Only Nguyen Van An is in APPLIED stage
      expect(screen.getByText("Nguyen Van An")).toBeInTheDocument();
      expect(screen.queryByText("Tran Thi Binh")).not.toBeInTheDocument();
      expect(screen.queryByText("Le Van Cuong")).not.toBeInTheDocument();
    });

    it("opens filter drawer and filters by job", () => {
      renderTable();
      const filterBtn = screen.getByRole("button", { name: /filter/i });
      fireEvent.click(filterBtn);

      expect(screen.getByRole("heading", { level: 3, name: "Filters" })).toBeInTheDocument();
      expect(screen.getByText("Filter by job")).toBeInTheDocument();
    });

    it("filters by match score in filter drawer and resets secondary filters", () => {
      renderTable();
      const filterBtn = screen.getByRole("button", { name: /filter/i });
      fireEvent.click(filterBtn);

      // Click score filter: ≥ 80% (Excellent)
      const score80Btn = screen.getByRole("button", { name: /≥ 80% \(Excellent\)/i });
      fireEvent.click(score80Btn);

      // Close drawer with Done
      const doneBtn = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneBtn);

      // Should show active filter chip
      expect(screen.getByText("≥ 80% (Excellent)")).toBeInTheDocument();
      // Le Van Cuong (92) and Nguyen Van An (85) match; Tran Thi Binh (70) excluded
      expect(screen.getByText("Le Van Cuong")).toBeInTheDocument();
      expect(screen.getByText("Nguyen Van An")).toBeInTheDocument();
      expect(screen.queryByText("Tran Thi Binh")).not.toBeInTheDocument();

      // Reset all filters
      const resetBtn = screen.getByRole("button", { name: /reset all/i });
      fireEvent.click(resetBtn);
      expect(screen.getByText("Tran Thi Binh")).toBeInTheDocument();
    });
  });

  // B.3.5: Drawer (3 tests)
  describe("5. Candidate Quick Drawer", () => {
    it("opens drawer when clicking an application row", () => {
      renderTable();
      const row = screen.getByText("Nguyen Van An");
      fireEvent.click(row);

      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByRole("heading", { level: 2, name: "Nguyen Van An" })).toBeInTheDocument();
      expect(within(drawer).getAllByText("+84901234567").length).toBeGreaterThan(0);
      expect(within(drawer).getByText("Back to table")).toBeInTheDocument();
    });

    it("switches drawer tabs between overview, notes, and documents", () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      // Overview active
      expect(screen.getByText("Match score:")).toBeInTheDocument();

      // Switch to notes tab
      const notesTab = screen.getByRole("button", { name: /^notes$/i });
      fireEvent.click(notesTab);
      expect(screen.getByPlaceholderText("Type a note...")).toBeInTheDocument();
    });

    it("closes drawer when clicking Back to table button", () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));
      expect(screen.getByText("Back to table")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Back to table"));
      expect(screen.queryByText("Back to table")).not.toBeInTheDocument();
    });
  });

  // B.3.6: Notes (2 tests)
  describe("6. Notes Tab in Drawer", () => {
    it("displays parsed existing candidate notes in overview and notes tabs", () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      // Notes in Overview
      expect(screen.getByText("Top candidate from referral")).toBeInTheDocument();
      expect(screen.getByText("Speaks fluent English")).toBeInTheDocument();
    });

    it("submits a new note and calls updateCandidateMutation", async () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const notesTab = screen.getByRole("button", { name: /^notes$/i });
      fireEvent.click(notesTab);

      const noteInput = screen.getByPlaceholderText("Type a note...");
      fireEvent.change(noteInput, { target: { value: "Completed background check" } });

      const addBtn = screen.getByRole("button", { name: "Add note" });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(mockUpdateCandidate).toHaveBeenCalledWith({
          id: "app-1",
          data: {
            notes: expect.stringContaining("Completed background check"),
          },
        });
      });
    });
  });

  // B.3.7: Interview Modals (2 tests)
  describe("7. Interviews Management", () => {
    it("displays scheduled interview info and allows canceling interview", async () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("Technical Interview")).toBeInTheDocument();
      expect(within(drawer).getByText("Alice Recruiter")).toBeInTheDocument();

      const cancelBtn = within(drawer).getByRole("button", { name: "Cancel this interview" });
      fireEvent.click(cancelBtn);

      // Confirm in destructive modal
      const cancelInput = screen.getByPlaceholderText('Type exactly "CANCEL"...');
      fireEvent.change(cancelInput, { target: { value: "CANCEL" } });

      const confirmBtn = screen.getByRole("button", { name: "Cancel this interview" });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteInterview).toHaveBeenCalledWith("intv-1");
      });
    });

    it("opens Schedule Interview modal from drawer", () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const scheduleBtn = screen.getByRole("button", { name: "Schedule interview" });
      fireEvent.click(scheduleBtn);

      expect(screen.getByText("Schedule Interview")).toBeInTheDocument();
    });
  });

  // B.3.8: Documents (3 tests)
  describe("8. Documents Section", () => {
    it("displays uploaded candidate resume document", () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      expect(screen.getByText("Nguyen_Van_An_CV.pdf")).toBeInTheDocument();
    });

    it("opens document preview modal on preview click", () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const drawer = screen.getByRole("dialog");
      const previewBtn = within(drawer).getByRole("button", { name: "Preview" });
      fireEvent.click(previewBtn);

      expect(screen.getByTitle("Nguyen_Van_An_CV.pdf")).toBeInTheDocument();
    });

    it("triggers authenticated file download when clicking download button", async () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const drawer = screen.getByRole("dialog");
      const downloadBtn = within(drawer).getByRole("button", { name: "Download" });
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(mockDownloadAuthenticatedFile).toHaveBeenCalled();
      });
    });
  });

  // B.3.9: Delete Application (2 tests)
  describe("9. Delete Application Flow", () => {
    it("opens delete confirmation modal when clicking trash button", () => {
      renderTable();
      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByRole("heading", { name: "Delete Application" })).toBeInTheDocument();
      expect(screen.getAllByText("Le Van Cuong").length).toBeGreaterThan(1);
    });

    it("confirms deletion and calls deleteAppMutation", async () => {
      renderTable();
      // First row is Le Van Cuong (app-3)
      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);

      // ConfirmDestructiveModal requires typing the candidate name
      const confirmInput = screen.getByPlaceholderText('Type exactly "Le Van Cuong"...');
      fireEvent.change(confirmInput, { target: { value: "Le Van Cuong" } });

      const confirmDeleteBtn = screen.getByRole("button", { name: "Delete Application" });
      expect(confirmDeleteBtn).not.toBeDisabled();
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(mockDeleteApp).toHaveBeenCalledWith("app-3");
      });
    });
  });

  // B.3.10: Stage Transition (2 tests)
  describe("10. Stage Transitions", () => {
    it("updates stage via StageSelector in drawer and calls updateStageMutation", async () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const drawer = screen.getByRole("dialog");
      // Valid transition from APPLIED -> SCREENING
      const screeningBtn = within(drawer).getByRole("button", { name: /screening/i });
      fireEvent.click(screeningBtn);

      await waitFor(() => {
        expect(mockUpdateStage).toHaveBeenCalledWith({
          id: "app-1",
          stage: "SCREENING",
        });
      });
    });

    it("prevents invalid stage transition when button is disabled", async () => {
      renderTable();
      fireEvent.click(screen.getByText("Nguyen Van An"));

      const drawer = screen.getByRole("dialog");
      // Direct transition from APPLIED -> HIRED is disallowed by recruitment workflow
      const hiredBtn = within(drawer).getByRole("button", { name: /hired/i });
      expect(hiredBtn).toBeDisabled();

      fireEvent.click(hiredBtn);
      expect(mockUpdateStage).not.toHaveBeenCalledWith(
        expect.objectContaining({ stage: "HIRED" }),
      );
    });
  });

  // B.3.11: Navigation & Pipelines (2 tests)
  describe("11. Navigation & Pipeline Actions", () => {
    it("calls onViewInPipeline when clicking View in Pipeline button in drawer", () => {
      const mockOnViewInPipeline = vi.fn();
      renderTable({ onViewInPipeline: mockOnViewInPipeline });

      fireEvent.click(screen.getByText("Nguyen Van An"));
      const viewPipelineBtn = screen.getByRole("button", { name: "View in pipeline" });
      fireEvent.click(viewPipelineBtn);

      expect(mockOnViewInPipeline).toHaveBeenCalledWith("app-1", "APPLIED");
    });

    it("navigates to application detail page when clicking quick view eye button", () => {
      renderTable();
      // First row is Le Van Cuong (app-3)
      const viewButtons = screen.getAllByTitle("View");
      fireEvent.click(viewButtons[0]);

      expect(mockPush).toHaveBeenCalledWith("/dashboard/applications/app-3");
    });
  });
});
