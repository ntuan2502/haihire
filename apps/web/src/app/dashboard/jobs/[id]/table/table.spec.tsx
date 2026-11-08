import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobTablePage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "job-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/jobs/job-1/table",
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
  ApplicationsDataTable: () => <div data-testid="applications-data-table">Table</div>,
}));

describe("JobTablePage", () => {
  it("renders full-width main container without max-w-7xl constraint", () => {
    const { container } = render(<JobTablePage />);

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.className).toContain("w-full");
    expect(main?.className).toContain("xl:px-10");
    expect(main?.className).not.toContain("max-w-7xl");
    expect(main?.className).not.toContain("mx-auto");
  });
});
