import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourcingChannel, type TrackingLinkItem } from "@haihire/shared";
import { CreateLinkModal } from "./create-link-modal";
import { EditLinkModal } from "./details/edit-link-modal";

vi.mock("@/hooks/use-sourcing-queries", () => ({
  useCreateTrackingLinkMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateTrackingLinkMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const mockJobs = [
  { id: "job-1", title: "Senior Frontend Engineer" },
  { id: "job-2", title: "Product Manager" },
];

const mockEditLink: TrackingLinkItem = {
  id: "link-456",
  organizationId: "org-1",
  name: "Google Jobs Summer Campaign",
  token: "lnk-google-456",
  source: SourcingChannel.GOOGLE_JOBS,
  customSource: null,
  jobId: "job-1",
  jobTitle: "Senior Frontend Engineer",
  campaign: "summer-campaign",
  medium: "job-board",
  utmSource: "google-jobs",
  utmMedium: "job-board",
  utmCampaign: "summer-campaign",
  utmTerm: "frontend",
  utmContent: "banner-ad",
  clicksCount: 120,
  applicationsCount: 8,
  conversionRate: 6.67,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("TrackingLinkModal (Unified Component)", () => {
  it("renders in create mode with blank/default fields and aligned buttons", () => {
    render(
      <CreateLinkModal
        isOpen={true}
        onClose={vi.fn()}
        jobs={mockJobs}
        orgSlug="acme-corp"
      />
    );

    // Modal title & submit button
    expect(screen.getByText("Tạo liên kết theo dõi mới")).toBeDefined();
    expect(screen.getByRole("button", { name: "Tạo liên kết" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Hủy bỏ" })).toBeDefined();

    // UTM inputs are directly visible with standard labels
    expect(screen.getByText("utm_source")).toBeDefined();
    expect(screen.getByText("utm_medium")).toBeDefined();
    expect(screen.getByText("utm_campaign")).toBeDefined();
    expect(screen.getByText("utm_term")).toBeDefined();
    expect(screen.getByText("utm_content")).toBeDefined();
  });

  it("renders in edit mode with prefilled values from link item", () => {
    render(
      <EditLinkModal
        isOpen={true}
        onClose={vi.fn()}
        link={mockEditLink}
        jobs={mockJobs}
        orgSlug="acme-corp"
      />
    );

    // Modal title & submit button
    expect(screen.getByText("Chỉnh sửa liên kết nguồn")).toBeDefined();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Hủy bỏ" })).toBeDefined();

    // Name field and UTM fields should be prefilled
    expect(screen.getByDisplayValue("Google Jobs Summer Campaign")).toBeDefined();
    expect(screen.getByDisplayValue("summer-campaign")).toBeDefined();
    expect(screen.getByDisplayValue("frontend")).toBeDefined();
    expect(screen.getByDisplayValue("banner-ad")).toBeDefined();
  });

  it("locks the job selection when lockJob is true", () => {
    render(
      <CreateLinkModal
        isOpen={true}
        onClose={vi.fn()}
        jobs={mockJobs}
        orgSlug="acme-corp"
        defaultJobId="job-1"
        lockJob={true}
      />
    );

    // Job lock hint is visible
    expect(screen.getByText("Cố định cho vị trí này")).toBeDefined();

    // The job dropdown trigger button is disabled
    const jobButton = screen.getByText("Senior Frontend Engineer").closest("button");
    expect(jobButton).toBeDefined();
    expect(jobButton?.hasAttribute("disabled")).toBe(true);
  });
});
