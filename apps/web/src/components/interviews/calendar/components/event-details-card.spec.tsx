import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventDetailsCard } from "./event-details-card";
import { getRecommendationLabel } from "@/lib/interviews";
import type { CalendarEventItem } from "../types";

const mockT = (key: string) => key;

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: mockT,
  }),
}));

function buildEventWithRecommendation(
  recommendation: "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO",
): CalendarEventItem {
  return {
    application: {
      id: "app-1",
      jobId: "job-1",
      candidateName: "Nguyen Van A",
      candidateEmail: "a@example.com",
      stage: "INTERVIEW",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    job: {
      id: "job-1",
      title: "Backend Engineer",
      status: "PUBLISHED",
      organizationId: "org-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as CalendarEventItem["job"],
    interview: {
      id: "intv-1",
      applicationId: "app-1",
      scheduledAt: "2026-05-01T09:00:00.000Z",
      type: "TECHNICAL",
      format: "ONLINE",
      linkOrLocation: "https://meet.example.com/room",
      interviewer: "Tran B",
      scorecard: {
        overallRating: 3,
        recommendation,
        feedback: "Technical assessment note",
      },
    },
  };
}

describe("EventDetailsCard recommendation badge semantics", () => {
  it("renders NO and STRONG_NO recommendations with rose danger classes and without emerald", () => {
    const { rerender } = render(
      <EventDetailsCard event={buildEventWithRecommendation("NO")} />,
    );

    const noLabel = getRecommendationLabel("NO", mockT);
    const noBadge = screen.getByText(noLabel);
    expect(noBadge.className).toContain("bg-rose-50");
    expect(noBadge.className).toContain("text-rose-700");
    expect(noBadge.className).not.toContain("bg-emerald-50");

    rerender(
      <EventDetailsCard event={buildEventWithRecommendation("STRONG_NO")} />,
    );
    const strongNoLabel = getRecommendationLabel("STRONG_NO", mockT);
    const strongNoBadge = screen.getByText(strongNoLabel);
    expect(strongNoBadge.className).toContain("bg-rose-50");
    expect(strongNoBadge.className).toContain("text-rose-700");
    expect(strongNoBadge.className).not.toContain("bg-emerald-50");
  });

  it("renders NEUTRAL recommendation with amber warning classes", () => {
    render(
      <EventDetailsCard event={buildEventWithRecommendation("NEUTRAL")} />,
    );

    const neutralLabel = getRecommendationLabel("NEUTRAL", mockT);
    const badge = screen.getByText(neutralLabel);
    expect(badge.className).toContain("bg-amber-50");
    expect(badge.className).toContain("text-amber-700");
    expect(badge.className).not.toContain("bg-emerald-50");
  });

  it("renders YES and STRONG_YES recommendations with emerald success classes", () => {
    const { rerender } = render(
      <EventDetailsCard event={buildEventWithRecommendation("YES")} />,
    );

    const yesBadge = screen.getByText(getRecommendationLabel("YES", mockT));
    expect(yesBadge.className).toContain("bg-emerald-50");
    expect(yesBadge.className).toContain("text-emerald-700");

    rerender(
      <EventDetailsCard event={buildEventWithRecommendation("STRONG_YES")} />,
    );
    const strongYesBadge = screen.getByText(
      getRecommendationLabel("STRONG_YES", mockT),
    );
    expect(strongYesBadge.className).toContain("bg-emerald-50");
    expect(strongYesBadge.className).toContain("text-emerald-700");
  });
});
