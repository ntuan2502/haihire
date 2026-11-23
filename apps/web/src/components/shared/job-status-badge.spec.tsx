import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobStatusBadge } from "./job-status-badge";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("JobStatusBadge", () => {
  it("BUG-27: renders distinct labels for PUBLISHED, CLOSED, ARCHIVED, and DRAFT statuses", () => {
    const { rerender } = render(<JobStatusBadge status="PUBLISHED" />);
    expect(screen.getByText("jobs.openStatus")).toBeInTheDocument();

    rerender(<JobStatusBadge status="CLOSED" />);
    expect(screen.getByText("jobs.closed")).toBeInTheDocument();

    rerender(<JobStatusBadge status="ARCHIVED" />);
    expect(screen.getByText("jobs.archivedStatus")).toBeInTheDocument();
    expect(screen.queryByText("jobs.draftStatus")).not.toBeInTheDocument();

    rerender(<JobStatusBadge status="DRAFT" />);
    expect(screen.getByText("jobs.draftStatus")).toBeInTheDocument();
  });
});
