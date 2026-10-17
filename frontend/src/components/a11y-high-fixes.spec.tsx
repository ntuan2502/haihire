import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationsTableRow } from "./applications/applications-data-table/table/applications-table-row";
import { ApplicationsTableView } from "./applications/applications-data-table/table/applications-table-view";
import type { Application, Job } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "applications.columns.candidate": "Candidate",
        "applications.columns.email": "Email",
        "applications.columns.job": "Job",
        "applications.columns.status": "Status",
        "applications.columns.score": "Score",
        "applications.columns.applied": "Applied",
        "common.actions": "Actions",
        "common.view": "View",
        "common.delete": "Delete",
        "dashboard.title": "Dashboard",
        "candidates.title": "Candidates",
      };
      return dict[key] || key;
    },
  }),
}));

describe("Task #39 Accessibility Fixes: Table & Navigation", () => {
  const mockApplication: Application = {
    id: "app-1",
    jobId: "job-1",
    candidateName: "John Doe",
    candidateEmail: "john@example.com",
    stage: "APPLIED",
    appliedDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    organizationId: "org-1",
  };

  const mockJob: Job = {
    id: "job-1",
    title: "Software Engineer",
    type: "FULL_TIME",
    status: "PUBLISHED",
    department: "Engineering",
    location: "Remote",
    organizationId: "org-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("applications table row renders candidate name as an accessible interactive button", () => {
    const handleSelect = vi.fn();
    const handleDelete = vi.fn();

    render(
      <table>
        <tbody>
          <ApplicationsTableRow
            application={mockApplication}
            job={mockJob}
            visibleColumns={{
              candidate: true,
              email: true,
              job: true,
              status: true,
              score: true,
              applied: true,
            }}
            onSelectApp={handleSelect}
            onDeleteApp={handleDelete}
            canEdit={true}
          />
        </tbody>
      </table>,
    );

    const candidateBtn = screen.getByRole("button", { name: "John Doe" });
    expect(candidateBtn).toBeInTheDocument();
    expect(candidateBtn).toHaveClass("focus-visible:ring-2");

    // Action buttons have accessible aria-labels
    const viewBtn = screen.getByRole("button", { name: "View" });
    expect(viewBtn).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    expect(deleteBtn).toBeInTheDocument();
  });

  it("applications table view renders sortable headers with scope='col', aria-sort, and keyboard buttons", () => {
    const handleSort = vi.fn();
    render(
      <ApplicationsTableView
        baseApplications={[mockApplication]}
        paginatedApps={[mockApplication]}
        jobMap={new Map([[mockJob.id, mockJob]])}
        visibleColumns={{
          candidate: true,
          email: true,
          job: true,
          status: true,
          score: true,
          applied: true,
        }}
        sortField="candidate"
        sortDirection="asc"
        handleSort={handleSort}
        onSelectApp={vi.fn()}
        onDeleteApp={vi.fn()}
        currentPage={1}
        totalPages={1}
        totalCount={1}
        rowsPerPage={10}
        onPageChangeHandler={vi.fn()}
        onPageSizeChangeHandler={vi.fn()}
      />,
    );

    // Active sorted column
    const candidateTh = screen.getByRole("columnheader", {
      name: /candidate/i,
    });
    expect(candidateTh).toHaveAttribute("aria-sort", "ascending");
    expect(candidateTh).toHaveAttribute("scope", "col");

    // Unsorted columns
    const emailTh = screen.getByRole("columnheader", { name: /email/i });
    expect(emailTh).toHaveAttribute("aria-sort", "none");
    expect(emailTh).toHaveAttribute("scope", "col");

    // Actions column
    const actionsTh = screen.getByRole("columnheader", { name: /actions/i });
    expect(actionsTh).toHaveAttribute("scope", "col");

    // Sort buttons inside headers
    const candidateSortBtn = screen.getByRole("button", { name: /candidate/i });
    expect(candidateSortBtn).toBeInTheDocument();
    expect(candidateSortBtn).toHaveClass("focus-visible:ring-2");
  });
});
