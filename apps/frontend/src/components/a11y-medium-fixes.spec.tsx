import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { JobTableRow } from "@/components/jobs/job-list/rows/job-table-row";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Job } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const dict: Record<string, string> = {
        "common.pagination": "Pagination",
        "common.showing": "Showing",
        "common.of": "of",
        "common.rows": "Rows",
        "common.page": "Page",
        "common.previous": "Previous",
        "common.next": "Next",
        "common.noData": "No data available",
        "common.view": "View",
        "common.edit": "Edit",
        "common.delete": "Delete",
        "common.remove": "Remove",
        "common.filter": "Filter",
        "jobs.copyPublicApplyLink": "Copy link",
        "jobs.newApplicants": "new applicants",
        "pipeline.stageCounts": "applicants",
        "landing.footerSystemsNormal": "All systems normal",
        "landing.footerPrivacy": "Privacy Policy",
        "landing.footerTerms": "Terms of Service",
        "landing.footerRights": `© ${new Date().getFullYear()} ${params?.brand || "HaiHire"}. All rights reserved.`,
      };
      return dict[key] || key;
    },
  }),
}));

describe("Task #40 Accessibility Fixes: Medium & Low Issues", () => {
  describe("Pagination component (#25)", () => {
    it("renders as an accessible nav element with aria-label", () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={50}
          pageSize={10}
          onPageChange={vi.fn()}
        />,
      );

      const nav = screen.getByRole("navigation", { name: "Pagination" });
      expect(nav).toBeDefined();
      expect(nav.tagName.toLowerCase()).toBe("nav");
    });

    it("applies aria-current='page' to the active page button and aria-label to all page buttons", () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={50}
          pageSize={10}
          onPageChange={vi.fn()}
        />,
      );

      const page2Btn = screen.getByRole("button", { name: "Page 2" });
      expect(page2Btn.getAttribute("aria-current")).toBe("page");

      const page1Btn = screen.getByRole("button", { name: "Page 1" });
      expect(page1Btn.getAttribute("aria-current")).toBeNull();
    });

    it("renders accessible previous and next buttons with aria-label and aria-hidden icons", () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={3}
          totalItems={30}
          pageSize={10}
          onPageChange={vi.fn()}
        />,
      );

      const prevBtn = screen.getByRole("button", { name: "Previous" });
      expect(prevBtn).toBeDefined();
      expect(prevBtn.getAttribute("disabled")).not.toBeNull();

      const nextBtn = screen.getByRole("button", { name: "Next" });
      expect(nextBtn).toBeDefined();
      expect(nextBtn.getAttribute("disabled")).toBeNull();

      // Ensure chevron icons have aria-hidden
      const prevIcon = prevBtn.querySelector("svg");
      expect(prevIcon?.getAttribute("aria-hidden")).toBe("true");

      const nextIcon = nextBtn.querySelector("svg");
      expect(nextIcon?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("JobTableRow action buttons & pulsing badge (#23, Low #3)", () => {
    const mockJob: Job = {
      id: "job-101",
      title: "Senior Product Designer",
      type: "FULL_TIME",
      status: "PUBLISHED",
      department: "Design",
      location: "Hanoi",
      organizationId: "org-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockCounts = {
      total: 12,
      new: 4,
      byStage: {
        APPLIED: 4,
        SCREENING: 3,
        INTERVIEW: 3,
        OFFER: 1,
        HIRED: 1,
        REJECTED: 0,
      },
    };

    it("renders all row action buttons with explicit aria-labels containing job title", () => {
      render(
        <table>
          <tbody>
            <JobTableRow
              job={mockJob}
              counts={mockCounts}
              visibleColumns={{
                status: true,
                pipeline: true,
                applicants: true,
              }}
              copiedJobId={null}
              onCopyLink={vi.fn()}
              onDeleteJob={vi.fn()}
            />
          </tbody>
        </table>,
      );

      // Copy link button
      const copyBtn = screen.getByRole("button", {
        name: "Copy link: Senior Product Designer",
      });
      expect(copyBtn).toBeDefined();
      expect(copyBtn.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );

      // View link
      const viewLink = screen.getByRole("link", {
        name: "View: Senior Product Designer",
      });
      expect(viewLink).toBeDefined();
      expect(viewLink.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );

      // Edit link
      const editLink = screen.getByRole("link", {
        name: "Edit: Senior Product Designer",
      });
      expect(editLink).toBeDefined();
      expect(editLink.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );

      // Delete button
      const deleteBtn = screen.getByRole("button", {
        name: "Delete: Senior Product Designer",
      });
      expect(deleteBtn).toBeDefined();
      expect(deleteBtn.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    });

    it("renders applicant badge as an accessible button with aria-hidden pulsing dot", () => {
      render(
        <table>
          <tbody>
            <JobTableRow
              job={mockJob}
              counts={mockCounts}
              visibleColumns={{
                status: true,
                pipeline: true,
                applicants: true,
              }}
              copiedJobId={null}
              onCopyLink={vi.fn()}
              onDeleteJob={vi.fn()}
            />
          </tbody>
        </table>,
      );

      const applicantBtn = screen.getByRole("button", {
        name: "4 new applicants - Senior Product Designer",
      });
      expect(applicantBtn).toBeDefined();

      const pulseDot = applicantBtn.querySelector(".animate-pulse");
      expect(pulseDot?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("SearchInput component (#6)", () => {
    it("renders with accessible aria-label and decorative icons aria-hidden", () => {
      render(
        <SearchInput
          placeholder="Search candidates..."
          aria-label="Search candidates"
          value=""
          onChange={vi.fn()}
        />,
      );

      const searchInput = screen.getByRole("textbox", {
        name: "Search candidates",
      });
      expect(searchInput).toBeDefined();

      // Search magnifying glass icon is decorative
      const searchSvg = document.querySelector("svg.lucide-search");
      expect(searchSvg?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("LandingFooter pulsing status dot (Low #3)", () => {
    it("renders status badge dot with aria-hidden='true'", () => {
      render(<LandingFooter />);

      const pulseDot = document.querySelector(".animate-pulse");
      expect(pulseDot).not.toBeNull();
      expect(pulseDot?.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
