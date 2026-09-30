import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourcingChannel, type TrackingLinkItem } from "@haihire/shared";
import { LinkHeader } from "./link-header";
import { LinkStatsCards } from "./link-stats-cards";
import { LinkConfigCard } from "./link-config-card";
import { LinkPipelineCard } from "./link-pipeline-card";

const mockLink: TrackingLinkItem = {
  id: "link-123",
  organizationId: "org-1",
  name: "LinkedIn Company Page - All Roles",
  token: "lnk-org1",
  source: SourcingChannel.LINKEDIN,
  customSource: null,
  jobId: null,
  jobTitle: null,
  campaign: "company-page-hiring",
  medium: "social",
  clicksCount: 512,
  applicationsCount: 2,
  conversionRate: 0.39,
  isActive: true,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const mockStats = {
  clicks: 512,
  applications: 2,
  cvr: 15,
  hireRate: 50,
  allTimeAttributed: 2,
};

const mockBreakdown = [
  { stage: "NEW", count: 2, percentage: 100 },
  { stage: "SCREENING", count: 0, percentage: 0 },
  { stage: "INTERVIEW", count: 0, percentage: 0 },
  { stage: "OFFER", count: 0, percentage: 0 },
  { stage: "HIRED", count: 0, percentage: 0 },
  { stage: "REJECTED", count: 0, percentage: 0 },
];

describe("Link Details Components", () => {
  it("renders LinkHeader correctly with title and action buttons", () => {
    const onTimeRangeChange = vi.fn();
    const onOpenEdit = vi.fn();
    const onCopyUrl = vi.fn();

    render(
      <LinkHeader
        link={mockLink}
        timeRange="30d"
        onTimeRangeChange={onTimeRangeChange}
        onOpenEdit={onOpenEdit}
        onCopyUrl={onCopyUrl}
        isCopied={false}
      />,
    );

    expect(
      screen.getByText("LinkedIn Company Page - All Roles"),
    ).toBeDefined();
    expect(screen.getByText("LinkedIn")).toBeDefined();
  });

  it("renders LinkStatsCards with 5 metric items", () => {
    render(<LinkStatsCards stats={mockStats} />);

    expect(screen.getByText("512")).toBeDefined();
    expect(screen.getByText("15%")).toBeDefined();
    expect(screen.getByText("50%")).toBeDefined();
  });

  it("renders LinkConfigCard with UTM parameters and channel info", () => {
    render(<LinkConfigCard link={mockLink} />);

    expect(screen.getByText("lnk-org1")).toBeDefined();
    expect(screen.getByText("company-page-hiring")).toBeDefined();
    expect(screen.getByText("social")).toBeDefined();
  });

  it("renders LinkPipelineCard with breakdown data", () => {
    render(
      <LinkPipelineCard
        breakdown={mockBreakdown}
        totalApplications={2}
      />,
    );

    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });
});
