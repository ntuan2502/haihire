import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CandidatesPage from "./page";
import type { CandidateItem } from "@/lib/utils";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParamString = "";

vi.mock("@/components/layout", () => ({
  Navbar: () => <div data-testid="mock-navbar" />,
}));

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/dashboard/candidates",
  useSearchParams: () => new URLSearchParams(mockSearchParamString),
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
    canEdit: true,
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

const mockCandidates: CandidateItem[] = [
  {
    id: "cand-1",
    name: "Nguyen Van A",
    email: "nguyenvana@example.com",
    phone: "0901234567",
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    resumeUrl: "https://minio.local/cv/nguyen-van-a.pdf",
    resumeFileName: "nguyen-van-a.pdf",
    resumeFileSize: 102400,
    resumeMimeType: "application/pdf",
    notes: "Top candidate for senior role",
    applicationsCount: 2,
    candidate: {
      id: "cand-1",
      name: "Nguyen Van A",
      email: "nguyenvana@example.com",
      phone: "0901234567",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
      resumeUrl: "https://minio.local/cv/nguyen-van-a.pdf",
      resumeFileName: "nguyen-van-a.pdf",
      notes: "Top candidate for senior role",
      applicationsCount: 2,
      applications: [
        {
          id: "app-1",
          jobId: "job-1",
          candidateId: "cand-1",
          stage: "INTERVIEW",
          createdAt: "2026-03-01T10:00:00.000Z",
        },
        {
          id: "app-2",
          jobId: "job-2",
          candidateId: "cand-1",
          stage: "OFFER",
          createdAt: "2026-03-02T10:00:00.000Z",
        },
      ],
    } as unknown as CandidateItem["candidate"],
  },
  {
    id: "cand-2",
    name: "Tran Thi B",
    email: "tranthib@example.com",
    phone: "0912345678",
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-05T10:00:00.000Z",
    resumeUrl: null,
    resumeFileName: null,
    resumeFileSize: null,
    resumeMimeType: null,
    notes: "Requires portfolio review",
    applicationsCount: 0,
    candidate: {
      id: "cand-2",
      name: "Tran Thi B",
      email: "tranthib@example.com",
      phone: "0912345678",
      createdAt: "2026-03-05T10:00:00.000Z",
      updatedAt: "2026-03-05T10:00:00.000Z",
      notes: "Requires portfolio review",
      applicationsCount: 0,
      applications: [],
    } as unknown as CandidateItem["candidate"],
  },
  {
    id: "cand-3",
    name: "Le Van C",
    email: "levanc@example.com",
    phone: "0923456789",
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    resumeUrl: "https://minio.local/cv/le-van-c.pdf",
    resumeFileName: "le-van-c.pdf",
    resumeFileSize: 204800,
    resumeMimeType: "application/pdf",
    notes: "",
    applicationsCount: 1,
    candidate: {
      id: "cand-3",
      name: "Le Van C",
      email: "levanc@example.com",
      phone: "0923456789",
      createdAt: "2026-03-10T10:00:00.000Z",
      updatedAt: "2026-03-10T10:00:00.000Z",
      resumeUrl: "https://minio.local/cv/le-van-c.pdf",
      resumeFileName: "le-van-c.pdf",
      applicationsCount: 1,
      applications: [
        {
          id: "app-3",
          jobId: "job-1",
          candidateId: "cand-3",
          stage: "SCREENING",
          createdAt: "2026-03-10T10:00:00.000Z",
        },
      ],
    } as unknown as CandidateItem["candidate"],
  },
];

const mockDeleteCandidateMutateAsync = vi.fn();
let candidatesDataset = [...mockCandidates];
let candidatesTotalCount = mockCandidates.length;
let candidatesLoadingState = false;

vi.mock("@/hooks/use-queries", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAllJobs: () => ({
      data: mockJobs,
      isLoading: false,
    }),
    useCandidates: (
      _orgId: string,
      _params: { page: number; limit: number; search?: string },
    ) => ({
      data: {
        data: candidatesDataset.map((c) => c.candidate),
        total: candidatesTotalCount,
        page: 1,
        limit: 20,
        totalPages: Math.ceil(candidatesTotalCount / 20) || 1,
      },
      isLoading: candidatesLoadingState,
    }),
    useCandidate: (id?: string) => ({
      data: mockCandidates.find((c) => c.id === id)?.candidate || null,
      isLoading: false,
    }),
    useDeleteCandidateMutation: () => ({
      mutateAsync: mockDeleteCandidateMutateAsync,
      isPending: false,
    }),
  };
});

describe("CandidatesPage Component - Characterization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamString = "";
    candidatesDataset = [...mockCandidates];
    candidatesTotalCount = mockCandidates.length;
    candidatesLoadingState = false;
    localStorage.clear();
  });

  // A.1.1: Rendering
  describe("A.1.1: Rendering", () => {
    it("renders candidate table with headers and candidate rows", () => {
      renderWithClient(<CandidatesPage />);

      // Headers
      expect(
        screen.getByRole("heading", { name: "Ứng viên" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Họ và tên")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Số điện thoại")).toBeInTheDocument();

      // Candidate rows
      expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
      expect(screen.getByText("Tran Thi B")).toBeInTheDocument();
      expect(screen.getByText("Le Van C")).toBeInTheDocument();
    });

    it("displays pagination controls with total candidate count", () => {
      renderWithClient(<CandidatesPage />);

      expect(screen.getAllByText("3").length).toBeGreaterThan(0);
      expect(
        screen.getByRole("navigation", { name: /phân trang|pagination/i }),
      ).toBeInTheDocument();
    });

    it("shows empty state when no candidates exist", () => {
      candidatesDataset = [];
      candidatesTotalCount = 0;

      renderWithClient(<CandidatesPage />);

      expect(screen.getByText("Chưa có ứng viên nào")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Thêm ứng viên đầu tiên để bắt đầu xây dựng nguồn nhân tài của bạn.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /Thêm ứng viên/i }).length,
      ).toBeGreaterThan(0);
    });
  });

  // A.1.2: URL sync
  describe("A.1.2: URL sync", () => {
    it("reads URL search parameters on mount", () => {
      mockSearchParamString = "search=Nguyen&page=1&limit=20";

      renderWithClient(<CandidatesPage />);

      const searchInput = screen.getByPlaceholderText(
        /Tìm theo tên, email, vị trí/i,
      );
      expect(searchInput).toHaveValue("Nguyen");
    });

    it("updates search input value when user types in search box", () => {
      renderWithClient(<CandidatesPage />);

      const searchInput = screen.getByPlaceholderText(
        /Tìm theo tên, email, vị trí/i,
      );
      fireEvent.change(searchInput, { target: { value: "Tran" } });

      expect(searchInput).toHaveValue("Tran");
    });

    it("handles page changes in pagination controls", () => {
      candidatesTotalCount = 45;

      renderWithClient(<CandidatesPage />);

      const pageButtons = screen.getAllByRole("button", { name: /2/ });
      expect(pageButtons.length).toBeGreaterThan(0);
      fireEvent.click(pageButtons[0]);
    });
  });

  // A.1.3: Tab filters
  describe("A.1.3: Tab filters", () => {
    it("filters candidates when clicking a status tab", () => {
      renderWithClient(<CandidatesPage />);

      // Click "Có CV" tab
      const withResumeTab = screen.getByRole("button", { name: /Có CV/i });
      fireEvent.click(withResumeTab);

      // Nguyen Van A and Le Van C have CVs
      expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
      expect(screen.getByText("Le Van C")).toBeInTheDocument();
      // Tran Thi B does not have CV
      expect(screen.queryByText("Tran Thi B")).not.toBeInTheDocument();
    });

    it("computes and displays accurate tab counts", () => {
      renderWithClient(<CandidatesPage />);

      // All: 3, With Resume: 2, Has Applications: 2, Unassigned: 1
      expect(screen.getByRole("button", { name: /Tất cả/i })).toHaveTextContent(
        "3",
      );
      expect(screen.getByRole("button", { name: /Có CV/i })).toHaveTextContent(
        "2",
      );
      expect(
        screen.getByRole("button", { name: /Có hồ sơ/i }),
      ).toHaveTextContent("2");
      expect(
        screen.getByRole("button", { name: /Chưa gắn việc/i }),
      ).toHaveTextContent("1");
    });

    it("restores all candidates when active tab is cleared", () => {
      renderWithClient(<CandidatesPage />);

      const unassignedTab = screen.getByRole("button", {
        name: /Chưa gắn việc/i,
      });
      fireEvent.click(unassignedTab);

      // Only Tran Thi B is unassigned
      expect(screen.queryByText("Nguyen Van A")).not.toBeInTheDocument();
      expect(screen.getByText("Tran Thi B")).toBeInTheDocument();

      // Click tab again to toggle off
      fireEvent.click(unassignedTab);

      // All candidates restored
      expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
      expect(screen.getByText("Tran Thi B")).toBeInTheDocument();
      expect(screen.getByText("Le Van C")).toBeInTheDocument();
    });
  });

  // A.1.4: Sorting
  describe("A.1.4: Sorting", () => {
    it("sorts candidates ascending and descending when column header is clicked", () => {
      renderWithClient(<CandidatesPage />);

      const nameSortBtn = screen.getByRole("button", { name: /Họ và tên/i });

      // Click to sort asc by name (Le Van C, Nguyen Van A, Tran Thi B)
      fireEvent.click(nameSortBtn);
      let rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Le Van C");
      expect(rows[2]).toHaveTextContent("Nguyen Van A");
      expect(rows[3]).toHaveTextContent("Tran Thi B");

      // Click to sort desc by name (Tran Thi B, Nguyen Van A, Le Van C)
      fireEvent.click(nameSortBtn);
      rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Tran Thi B");
      expect(rows[2]).toHaveTextContent("Nguyen Van A");
      expect(rows[3]).toHaveTextContent("Le Van C");
    });

    it("updates aria-sort attribute on table header when sorting changes", () => {
      renderWithClient(<CandidatesPage />);

      const nameHeader = screen.getByRole("columnheader", {
        name: /Họ và tên/i,
      });
      expect(nameHeader).toHaveAttribute("aria-sort", "none");

      const nameSortBtn = screen.getByRole("button", { name: /Họ và tên/i });
      fireEvent.click(nameSortBtn);
      expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

      fireEvent.click(nameSortBtn);
      expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    });
  });

  // A.1.5: Column visibility
  describe("A.1.5: Column visibility", () => {
    it("toggles column visibility from the column picker dropdown", () => {
      renderWithClient(<CandidatesPage />);

      // Columns dropdown button
      const columnsBtn = screen.getByRole("button", { name: /Cột/i });
      fireEvent.click(columnsBtn);

      // Uncheck "Số điện thoại"
      const phoneCheckbox = screen.getByRole("checkbox", {
        name: "Số điện thoại",
      });
      fireEvent.click(phoneCheckbox);

      // Header is now hidden
      expect(
        screen.queryByRole("columnheader", { name: /Số điện thoại/i }),
      ).not.toBeInTheDocument();
    });

    it("persists column visibility selection in localStorage", () => {
      renderWithClient(<CandidatesPage />);

      const columnsBtn = screen.getByRole("button", { name: /Cột/i });
      fireEvent.click(columnsBtn);

      const phoneCheckbox = screen.getByRole("checkbox", {
        name: "Số điện thoại",
      });
      fireEvent.click(phoneCheckbox);

      const stored = localStorage.getItem("haihire_candidates_columns_v1");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.phone).toBe(false);
    });
  });

  // A.1.6: Filter drawer
  describe("A.1.6: Filter drawer", () => {
    it("opens filter drawer when filter button is clicked", () => {
      renderWithClient(<CandidatesPage />);

      const filterBtn = screen.getByRole("button", { name: /Lọc/i });
      fireEvent.click(filterBtn);

      expect(screen.getByText("Bộ lọc")).toBeInTheDocument();
      expect(screen.getByText("Lọc theo tin tuyển dụng")).toBeInTheDocument();
    });

    it("filters candidates by selected job in filter drawer and displays active filter chip", () => {
      renderWithClient(<CandidatesPage />);

      const filterBtn = screen.getByRole("button", { name: /Lọc/i });
      fireEvent.click(filterBtn);

      // Open CustomSelect dropdown
      const jobSelectTrigger = screen.getByText("Tất cả tin tuyển dụng");
      fireEvent.click(jobSelectTrigger);

      // Select job-1 ("Senior Frontend Engineer") in drawer
      const jobOption = screen.getByRole("option", {
        name: "Senior Frontend Engineer",
      });
      fireEvent.click(jobOption);

      // Active filter chip appears in toolbar
      expect(
        screen.getAllByText("Senior Frontend Engineer").length,
      ).toBeGreaterThan(0);

      // Only candidates with applications to job-1 remain visible
      expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
      expect(screen.getByText("Le Van C")).toBeInTheDocument();
      expect(screen.queryByText("Tran Thi B")).not.toBeInTheDocument();
    });
  });

  // A.1.7: Row click & Drawer
  describe("A.1.7: Row click & Drawer", () => {
    it("opens candidate drawer when a candidate row is clicked", () => {
      renderWithClient(<CandidatesPage />);

      const candidateNameBtn = screen.getByRole("button", {
        name: "Nguyen Van A",
      });
      fireEvent.click(candidateNameBtn);

      // Drawer opened with candidate details
      const headings = screen.getAllByText("Nguyen Van A");
      expect(headings.length).toBeGreaterThan(1);
    });

    it("displays candidate contact and application information in the drawer", () => {
      renderWithClient(<CandidatesPage />);

      const candidateNameBtn = screen.getByRole("button", {
        name: "Nguyen Van A",
      });
      fireEvent.click(candidateNameBtn);

      expect(
        screen.getAllByText("nguyenvana@example.com").length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText("0901234567").length).toBeGreaterThan(0);
    });
  });

  // A.1.8: Delete action
  describe("A.1.8: Delete action", () => {
    it("opens delete confirmation modal and dispatches delete mutation on confirm", async () => {
      mockDeleteCandidateMutateAsync.mockResolvedValueOnce({ success: true });

      renderWithClient(<CandidatesPage />);

      const deleteButtons = screen.getAllByRole("button", { name: /Xóa/i });
      // Row 0 is cand-3 ("Le Van C") due to default desc sort by added date
      fireEvent.click(deleteButtons[0]);

      // Confirm modal opens
      expect(
        screen.getByRole("heading", { name: "Xóa ứng viên" }),
      ).toBeInTheDocument();

      // Enter matching candidate name
      const confirmInput = document.getElementById(
        "confirm-destructive-input",
      ) as HTMLInputElement;
      expect(confirmInput).toBeInTheDocument();
      fireEvent.change(confirmInput, { target: { value: "Le Van C" } });

      // Form submission
      const form = confirmInput.closest("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockDeleteCandidateMutateAsync).toHaveBeenCalledWith("cand-3");
      });
    });
  });
});
