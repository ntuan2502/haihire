import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourcingStatsCards } from "./sourcing-stats";
import type { SourcingStats } from "@haihire/shared";

const mockStats: SourcingStats = {
  trackedCount: 57,
  totalApplications: 57,
  attributionRate: 100,
  activeLinksCount: 17,
  totalLinksCount: 19,
  untrackedCount: 0,
  channelBreakdown: [],
  topLinks: [],
  topReferrers: [],
  recentAttributed: [],
  conversionBySource: [],
};

describe("SourcingStatsCards", () => {
  it("renders metric cards with correct values", () => {
    render(<SourcingStatsCards stats={mockStats} />);

    expect(screen.getByText("57")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("17")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined();
  });

  it("renders loading skeletons when isLoading is true", () => {
    const { container } = render(<SourcingStatsCards isLoading={true} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(4);
  });
});
