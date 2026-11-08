import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { JobClosed } from "./job-closed";
import type { Job } from "@/types";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

describe("JobClosed Component", () => {
  const mockJob: Job = {
    id: "job-secops",
    title: "Information Security & SecOps Specialist",
    department: "Security",
    location: "Hanoi, Vietnam",
    workplace: "HYBRID",
    type: "FULL_TIME",
    status: "CLOSED",
    description: "Job description text",
    organizationId: "org-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("renders closed job badge, job title, and organization link correctly", () => {
    render(
      <JobClosed
        job={mockJob}
        org={{ id: "org-admin", name: "Admin Corp", slug: "admin" }}
        orgSlug="admin"
      />,
    );

    // Job title
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Information Security & SecOps Specialist",
    );

    // Organization name (appears in header and card)
    expect(screen.getAllByText("Admin Corp").length).toBeGreaterThanOrEqual(1);

    // Department & Location
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Hanoi, Vietnam")).toBeInTheDocument();

    // Links back to all jobs (header hero button and sidebar CTA)
    const ctaLinks = screen.getAllByRole("link", { name: /xem các vị trí khác/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    ctaLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/careers/admin");
    });
  });
});
