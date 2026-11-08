import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { JobList } from "./job-list";
import type { Job } from "@/types";
import { en } from "@/i18n/locales/en";

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
    if (cur && typeof cur === "object")
      cur = (cur as Record<string, unknown>)[p];
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
    applicationsCount: 15,
    applicationsByStage: {
      APPLIED: 5,
      SCREENING: 4,
      INTERVIEW: 3,
      OFFER: 2,
      HIRED: 1,
      REJECTED: 0,
    },
    organizationId: "org-1",
  },
  {
    id: "job-2",
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "CONTRACT",
    experienceLevel: "MID_LEVEL",
    workplace: "REMOTE",
    status: "DRAFT",
    description: "Design intuitive and delightful UX flows",
    createdAt: "2026-01-10T00:00:00.000Z",
    applicationsCount: 0,
    applicationsByStage: {},
    organizationId: "org-1",
  },
  {
    id: "job-3",
    title: "DevOps Architect",
    department: "Infrastructure",
    location: "Ho Chi Minh City",
    type: "FULL_TIME",
    experienceLevel: "LEAD",
    workplace: "ON_SITE",
    status: "CLOSED",
    description: "Manage Kubernetes clusters and pipelines",
    createdAt: "2025-12-01T00:00:00.000Z",
    applicationsCount: 8,
    applicationsByStage: {
      APPLIED: 0,
      SCREENING: 2,
      INTERVIEW: 2,
      OFFER: 2,
      HIRED: 2,
      REJECTED: 0,
    },
    organizationId: "org-1",
  },
];

describe("JobList Component - Characterization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. RENDERING TESTS
  describe("1. Rendering & Layout", () => {
    it("renders job table with job titles, departments and locations", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      expect(screen.getByText("Senior Full-Stack Engineer")).toBeDefined();
      expect(screen.getByText("Product Designer")).toBeDefined();
      expect(screen.getByText("DevOps Architect")).toBeDefined();
      expect(screen.getByText("Engineering")).toBeDefined();
      expect(screen.getByText("Design")).toBeDefined();
      expect(screen.getByText("Hanoi")).toBeDefined();
    });

    it("displays status counts in status tabs", () => {
      render(
        <JobList
          jobs={mockJobs}
          loading={false}
          onDeleteJob={vi.fn()}
          statusCounts={{
            all: 3,
            published: 1,
            draft: 1,
            closed: 1,
          }}
        />,
      );

      const statusGroup = screen.getByRole("group", {
        name: /filter status tabs/i,
      });
      expect(within(statusGroup).getByText("All")).toBeDefined();
      expect(within(statusGroup).getByText("Open")).toBeDefined();
      expect(within(statusGroup).getByText("Draft")).toBeDefined();
      expect(within(statusGroup).getByText("Closed")).toBeDefined();
    });

    it("shows empty state when no jobs match or jobs array is empty", () => {
      render(<JobList jobs={[]} loading={false} onDeleteJob={vi.fn()} />);

      expect(screen.getByText(en.jobs.noJobsFound)).toBeDefined();
      expect(screen.getByText(en.jobs.noJobsDesc)).toBeDefined();
    });
  });

  // 2. FILTERING TESTS (CLIENT-SIDE)
  describe("2. Filtering & Search (Client-Side)", () => {
    it("filters jobs by search input text", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(en.jobs.searchJobs);
      fireEvent.change(searchInput, { target: { value: "Designer" } });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      expect(screen.getByText("Product Designer")).toBeDefined();
      expect(screen.queryByText("Senior Full-Stack Engineer")).toBeNull();
      expect(screen.queryByText("DevOps Architect")).toBeNull();
    });

    it("filters jobs by location in search input", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(en.jobs.searchJobs);
      fireEvent.change(searchInput, { target: { value: "Ho Chi Minh" } });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      expect(screen.getByText("DevOps Architect")).toBeDefined();
      expect(screen.queryByText("Senior Full-Stack Engineer")).toBeNull();
    });

    it("calls onSearchChange when search is controlled", () => {
      const handleSearchChange = vi.fn();
      render(
        <JobList
          jobs={mockJobs}
          loading={false}
          onDeleteJob={vi.fn()}
          search=""
          onSearchChange={handleSearchChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(en.jobs.searchJobs);
      fireEvent.change(searchInput, { target: { value: "Engineer" } });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      expect(handleSearchChange).toHaveBeenCalledWith("Engineer");
    });

    it("resets search and filters when clicking cancel button in empty state", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(en.jobs.searchJobs);
      fireEvent.change(searchInput, {
        target: { value: "NonExistentJob12345" },
      });
      fireEvent.keyDown(searchInput, { key: "Enter" });

      expect(screen.getByText(en.jobs.noJobsFound)).toBeDefined();

      const cancelBtn = screen.getByText(en.common.cancel);
      fireEvent.click(cancelBtn);

      expect(screen.getByText("Senior Full-Stack Engineer")).toBeDefined();
    });
  });

  // 3. SORTING TESTS
  describe("3. Sorting", () => {
    it("sorts jobs by title ascending and descending", () => {
      const { rerender } = render(
        <JobList
          jobs={mockJobs}
          loading={false}
          onDeleteJob={vi.fn()}
          sortBy="title"
          sortOrder="asc"
        />,
      );

      const rows = screen.getAllByRole("row");
      // Header row is index 0. Row 1 should be DevOps Architect (D < P < S)
      expect(rows[1].textContent).toContain("DevOps Architect");

      rerender(
        <JobList
          jobs={mockJobs}
          loading={false}
          onDeleteJob={vi.fn()}
          sortBy="title"
          sortOrder="desc"
        />,
      );

      const rowsDesc = screen.getAllByRole("row");
      // Row 1 should be Senior Full-Stack Engineer (S > P > D)
      expect(rowsDesc[1].textContent).toContain("Senior Full-Stack Engineer");
    });

    it("sorts jobs by applicants count", () => {
      render(
        <JobList
          jobs={mockJobs}
          loading={false}
          onDeleteJob={vi.fn()}
          sortBy="applicants"
          sortOrder="desc"
        />,
      );

      const rows = screen.getAllByRole("row");
      // Job 1 has 15 applicants (highest), Job 3 has 8, Job 2 has 0
      expect(rows[1].textContent).toContain("Senior Full-Stack Engineer");
      expect(rows[2].textContent).toContain("DevOps Architect");
      expect(rows[3].textContent).toContain("Product Designer");
    });
  });

  // 4. STAGE COUNTS & PIPELINE
  describe("4. Stage Counts & Pipeline Funnel", () => {
    it("renders stage metric pills and navigates when clicked", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      // Find the pill for job-1 with APPLIED count = 5
      const appliedCount = screen.getByText("5");
      expect(appliedCount).toBeDefined();

      // Click the pill
      fireEvent.click(appliedCount.parentElement!);

      expect(mockPush).toHaveBeenCalledWith(
        "/dashboard/jobs/job-1/pipeline?stage=APPLIED",
      );
    });

    it("renders new applicants badge with pulse indicator when count > 0", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const badge = screen.getByText(/5 new/i);
      expect(badge).toBeDefined();

      fireEvent.click(badge);
      expect(mockPush).toHaveBeenCalledWith(
        "/dashboard/jobs/job-1/pipeline?stage=APPLIED",
      );
    });
  });

  // 5. COLUMN VISIBILITY DROPDOWN
  describe("5. Column Visibility Dropdown", () => {
    it("opens columns toggle dropdown and allows toggling status column", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const columnsBtn = screen.getByText(en.common.columns);
      fireEvent.click(columnsBtn);

      expect(screen.getByText(en.jobs.toggleColumns)).toBeDefined();

      // Find checkbox for Status
      const statusCheckbox = screen.getByLabelText(
        en.jobs.columns.status,
      ) as HTMLInputElement;
      expect(statusCheckbox.checked).toBe(true);

      fireEvent.click(statusCheckbox);
      expect(statusCheckbox.checked).toBe(false);
    });

    it("prevents unchecking locked Title column", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const columnsBtn = screen.getByText(en.common.columns);
      fireEvent.click(columnsBtn);

      const titleCheckbox = screen.getByLabelText(
        en.jobs.columns.title,
      ) as HTMLInputElement;
      expect(titleCheckbox.disabled).toBe(true);
    });
  });

  // 6. FILTER SLIDEOVER DRAWER
  describe("6. SlideOver Filter Drawer", () => {
    it("opens filter drawer when clicking filter button and displays categories", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const filterBtn = screen.getByText(en.common.filter);
      fireEvent.click(filterBtn);

      expect(screen.getByText(en.jobs.filterJobs)).toBeDefined();
      expect(screen.getByText(en.jobs.employmentTypeUpper)).toBeDefined();
      expect(screen.getByText(en.jobs.experienceLevelUpper)).toBeDefined();
      expect(screen.getByText(en.jobs.workArrangementUpper)).toBeDefined();
    });

    it("toggles employment type filter inside drawer and updates active chips", () => {
      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      // Open drawer
      fireEvent.click(screen.getByText(en.common.filter));

      // Click "Full-time" button inside drawer
      const drawer = screen.getByRole("dialog");
      const fullTimeBtn = within(drawer).getByRole("button", {
        name: en.jobs.fullTime,
      });
      fireEvent.click(fullTimeBtn);

      // Close drawer with Done button
      fireEvent.click(screen.getByText(en.jobs.done));

      // Active chip should be rendered with remove button
      expect(screen.getByTitle("Remove filter")).toBeDefined();
      expect(screen.getAllByText(en.jobs.fullTime).length).toBeGreaterThan(0);
      // Product Designer is CONTRACT, so it shouldn't be in the table
      expect(screen.queryByText("Product Designer")).toBeNull();
      expect(screen.getByText("Senior Full-Stack Engineer")).toBeDefined();
    });

    it("calls onFilterChange when filters update in controlled mode", () => {
      const handleFilterChange = vi.fn();
      render(
        <JobList
          jobs={mockJobs}
          loading={false}
          onDeleteJob={vi.fn()}
          onFilterChange={handleFilterChange}
        />,
      );

      fireEvent.click(screen.getByText(en.common.filter));
      const drawer = screen.getByRole("dialog");
      const remoteBtn = within(drawer).getByRole("button", {
        name: en.jobs.workplace.remote,
      });
      fireEvent.click(remoteBtn);

      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          workplace: "REMOTE",
        }),
      );
    });
  });

  // 7. ACTIONS & INTERACTIONS
  describe("7. Actions: Copy Link, View, Edit, Delete", () => {
    it("calls onDeleteJob with job.id when clicking delete button", () => {
      const handleDelete = vi.fn();
      render(
        <JobList jobs={mockJobs} loading={false} onDeleteJob={handleDelete} />,
      );

      // When sorted by createdAt desc (default):
      // row 1 is job-2 (2026-01-10), row 2 is job-1 (2026-01-01), row 3 is job-3 (2025-12-01)
      const deleteButtons = screen.getAllByTitle(en.common.delete);
      expect(deleteButtons.length).toBe(3);

      fireEvent.click(deleteButtons[0]);
      expect(handleDelete).toHaveBeenCalledWith("job-2");

      fireEvent.click(deleteButtons[1]);
      expect(handleDelete).toHaveBeenCalledWith("job-1");
    });

    it("copies public job url to clipboard when clicking copy link button", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<JobList jobs={mockJobs} loading={false} onDeleteJob={vi.fn()} />);

      const copyButtons = screen.getAllByTitle(en.jobs.copyPublicApplyLink);
      fireEvent.click(copyButtons[0]);

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("/careers/"),
      );
    });
  });

  // 8. PAGINATION
  describe("8. Pagination", () => {
    it("renders pagination controls and calls onPageChange when page clicked", () => {
      const handlePageChange = vi.fn();
      render(
        <JobList
          jobs={mockJobs}
          total={30}
          currentPage={1}
          totalPages={3}
          pageSize={10}
          onPageChange={handlePageChange}
          loading={false}
          onDeleteJob={vi.fn()}
        />,
      );

      // Pagination button for page 2
      const page2Btn = screen.getByRole("button", { name: /^Page 2$|^2$/ });
      fireEvent.click(page2Btn);

      expect(handlePageChange).toHaveBeenCalledWith(2);
    });
  });
});
