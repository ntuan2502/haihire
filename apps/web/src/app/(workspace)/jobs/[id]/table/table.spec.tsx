import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobTablePage from "./page";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParamString = "";
let capturedTableProps: Record<string, unknown> = {};

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "job-1" }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamString),
  usePathname: () => "/jobs/job-1/table",
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@example.com", organizationId: "org-1" },
    canEdit: true,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useJob: (id: string) => ({
    data: { id, title: "Senior Frontend Engineer" },
    isLoading: false,
  }),
  useAllJobs: () => ({
    data: [{ id: "job-1", title: "Senior Frontend Engineer" }],
    isLoading: false,
  }),
  useJobApplications: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock("@/components/applications/applications-data-table", () => ({
  ApplicationsDataTable: (props: Record<string, unknown>) => {
    capturedTableProps = props;
    return <div data-testid="applications-data-table">Table</div>;
  },
}));

describe("JobTablePage", () => {
  it("renders full-width main container without max-w-7xl constraint", () => {
    mockSearchParamString = "";
    const { container } = render(<JobTablePage />);

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.className).toContain("w-full");
    expect(main?.className).toContain("xl:px-10");
    expect(main?.className).not.toContain("max-w-7xl");
    expect(main?.className).not.toContain("mx-auto");
  });

  it("hydrates all filter, sort, pagination, and drawer fields from URL query params", () => {
    mockSearchParamString =
      "page=2&limit=50&search=Lan&stage=SCREENING,INTERVIEW&score=80&sortBy=score&sortOrder=asc&applicationId=app-9&tab=documents";
    render(<JobTablePage />);

    expect(capturedTableProps.currentPage).toBe(2);
    expect(capturedTableProps.rowsPerPage).toBe(50);
    expect(capturedTableProps.search).toBe("Lan");
    expect(capturedTableProps.stageFilter).toBe("SCREENING,INTERVIEW");
    expect(capturedTableProps.scoreFilter).toBe("80");
    expect(capturedTableProps.sortField).toBe("score");
    expect(capturedTableProps.sortDirection).toBe("asc");
    expect(capturedTableProps.selectedAppId).toBe("app-9");
    expect(capturedTableProps.drawerTab).toBe("documents");
  });
});
