import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { InterviewsFilterBar, type ViewMode } from "./interviews-filter-bar";
import { InterviewsFilterDrawer } from "./interviews-filter-drawer";
import type { Job } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.count !== undefined) return `${key}:${params.count}`;
      return key;
    },
  }),
}));

vi.mock("@/i18n/optional", () => ({
  useOptionalI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockJobs: Job[] = [
  {
    id: "job-1",
    organizationId: "org-1",
    title: "Frontend Engineer",
    department: "Engineering",
    location: "Hanoi",
    type: "FULL_TIME",
    status: "PUBLISHED",
    description: "Frontend role",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockTabs = [
  { id: "ALL", label: "All", count: 5 },
  { id: "UPCOMING", label: "Scheduled", count: 3 },
  { id: "AWAITING", label: "Awaiting", count: 2 },
];

const defaultColumns = {
  candidate: true,
  job: true,
  schedule: true,
  interviewer: true,
  status: true,
  rating: true,
};

function FilterControlsHarness({
  viewMode,
  isDrawerOpen,
}: {
  viewMode: ViewMode;
  isDrawerOpen: boolean;
}) {
  return (
    <div>
      <InterviewsFilterBar
        tabs={mockTabs}
        activeTab="UPCOMING"
        onTabChange={vi.fn()}
        viewMode={viewMode}
        onViewModeChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        visibleColumns={defaultColumns}
        onToggleColumn={vi.fn()}
        onOpenFilterDrawer={vi.fn()}
        selectedJobFilter="job-1"
        sortBy="newest"
        jobs={mockJobs}
        onResetFilters={vi.fn()}
        onClearJobFilter={vi.fn()}
        onClearSortFilter={vi.fn()}
      />
      <InterviewsFilterDrawer
        isOpen={isDrawerOpen}
        onClose={vi.fn()}
        jobs={mockJobs}
        selectedJobFilter="job-1"
        onJobFilterChange={vi.fn()}
        activeTab="UPCOMING"
        onTabChange={vi.fn()}
        totalCandidateCount={5}
        scheduledCount={3}
        awaitingCount={2}
        sortBy="newest"
        onSortByChange={vi.fn()}
        onResetFilters={vi.fn()}
        viewMode={viewMode}
      />
    </div>
  );
}

describe("InterviewsFilterBar & InterviewsFilterDrawer", () => {
  it("shows status tabs, columns dropdown, and sort controls in table mode", () => {
    const { rerender } = render(
      <FilterControlsHarness viewMode="table" isDrawerOpen={false} />,
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Scheduled/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Awaiting/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.columns" }),
    ).toBeInTheDocument();
    expect(screen.getByText("interviews.sortNewest")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.filter2" }),
    ).toBeInTheDocument();

    rerender(<FilterControlsHarness viewMode="table" isDrawerOpen={true} />);

    expect(
      screen.getByText("interviews.tableHeaders.status"),
    ).toBeInTheDocument();
    expect(screen.getByText("jobs.sortByUpper")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByText("interviews.sortNewest"),
    ).toBeInTheDocument();
  });

  it("hides status tabs, columns dropdown, and sort controls in calendar mode while keeping search and job filter", () => {
    const { rerender } = render(
      <FilterControlsHarness viewMode="calendar" isDrawerOpen={false} />,
    );

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Scheduled")).not.toBeInTheDocument();
    expect(screen.queryByText("Awaiting")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "common.columns" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("interviews.sortNewest")).not.toBeInTheDocument();

    // Essential bar controls remain visible in calendar mode
    expect(
      screen.getByRole("button", { name: "interviews.table" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "interviews.calendar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("interviews.searchPlaceholder"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.filter1" }),
    ).toBeInTheDocument();

    rerender(<FilterControlsHarness viewMode="calendar" isDrawerOpen={true} />);

    expect(
      screen.queryByText("interviews.tableHeaders.status"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("jobs.sortByUpper")).not.toBeInTheDocument();
    expect(screen.queryByText("interviews.sortNewest")).not.toBeInTheDocument();
    expect(screen.getByText("applications.filterByJob")).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
  });
});
