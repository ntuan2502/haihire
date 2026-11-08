import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import OrgCareersPage, { generateMetadata as genOrgMeta } from "./[orgSlug]/page";
import JobDetailPage, { generateMetadata as genJobMeta } from "./[orgSlug]/[jobSlug]/page";
import fs from "node:fs";
import path from "node:path";

// Mock child client components
vi.mock("@/components/careers/org-careers-client", () => ({
  OrgCareersClient: (props: unknown) => <div data-testid="org-careers-client">{JSON.stringify(props)}</div>,
}));

vi.mock("@/components/careers/job-details-client", () => ({
  JobDetailsClient: (props: unknown) => <div data-testid="job-details-client">{JSON.stringify(props)}</div>,
}));

vi.mock("./[orgSlug]/[jobSlug]/job-closed", () => ({
  JobClosed: (props: { job: { title: string; status: string } }) => (
    <div data-testid="job-closed">
      <h1>{props.job.title}</h1>
      <span>{props.job.status}</span>
    </div>
  ),
}));

describe("Career Pages React Server Components (RSC) Audit (Phase 16A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Verify Rule: neither career page has 'use client' directive", () => {
    const orgPageContent = fs.readFileSync(
      path.resolve(__dirname, "[orgSlug]/page.tsx"),
      "utf-8",
    );
    const jobPageContent = fs.readFileSync(
      path.resolve(__dirname, "[orgSlug]/[jobSlug]/page.tsx"),
      "utf-8",
    );

    expect(orgPageContent.startsWith('"use client"')).toBe(false);
    expect(orgPageContent.startsWith("'use client'")).toBe(false);
    expect(jobPageContent.startsWith('"use client"')).toBe(false);
    expect(jobPageContent.startsWith("'use client'")).toBe(false);
  });

  describe("Org Careers RSC (page.tsx)", () => {
    it("generates dynamic OpenGraph and Twitter metadata on the server", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/organizations/public/techcorp")) {
          return {
            ok: true,
            json: async () => ({ id: "org-1", name: "TechCorp Global", slug: "techcorp" }),
          };
        }
        return { ok: true, json: async () => ({ data: [] }) };
      });

      const meta = await genOrgMeta({ params: Promise.resolve({ orgSlug: "techcorp" }) });

      expect(meta.title).toBe("Careers at TechCorp Global | Join Our Team");
      expect(meta.openGraph?.title).toBe("Careers at TechCorp Global | Join Our Team");
      expect(meta.openGraph?.url).toBe("/careers/techcorp");
      expect(meta.twitter?.card).toBe("summary_large_image");
    });

    it("renders server-side HTML content for search engine indexation", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/organizations/public/techcorp")) {
          return {
            ok: true,
            json: async () => ({ id: "org-1", name: "TechCorp Global", slug: "techcorp", description: "Leading tech provider" }),
          };
        }
        if (url.includes("/jobs")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: "job-1",
                  title: "Staff Platform Engineer",
                  slug: "staff-platform-engineer",
                  department: "Infrastructure",
                  location: "Remote",
                  type: "FULL_TIME",
                  description: "Help scale our cloud systems",
                },
              ],
            }),
          };
        }
        return { ok: false };
      });

      const element = await OrgCareersPage({ params: Promise.resolve({ orgSlug: "techcorp" }) });
      const { container } = render(element);

      // Verify HTML content exists for SEO crawlers without running JavaScript
      expect(container.innerHTML).toContain("TechCorp Global");
      expect(container.innerHTML).toContain("Staff Platform Engineer");
      expect(container.innerHTML).toContain("Infrastructure");
    });
  });

  describe("Job Details RSC ([jobSlug]/page.tsx)", () => {
    it("generates dynamic OpenGraph, Twitter, and JSON-LD metadata on the server", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/organizations/public/techcorp")) {
          return {
            ok: true,
            json: async () => ({ id: "org-1", name: "TechCorp Global", slug: "techcorp" }),
          };
        }
        if (url.includes("/jobs/careers/")) {
          return {
            ok: true,
            json: async () => ({
              id: "job-1",
              title: "Staff Platform Engineer",
              slug: "staff-platform-engineer",
              department: "Infrastructure",
              location: "San Francisco, CA",
              type: "FULL_TIME",
              description: "Build robust cloud infrastructure",
              organization: { name: "TechCorp Global" },
            }),
          };
        }
        return { ok: false };
      });

      const meta = await genJobMeta({
        params: Promise.resolve({ orgSlug: "techcorp", jobSlug: "staff-platform-engineer" }),
      });

      expect(meta.title).toBe("Staff Platform Engineer at TechCorp Global | HaiHire Careers");
      expect(meta.openGraph?.title).toBe("Staff Platform Engineer - TechCorp Global");
      expect(meta.openGraph?.type).toBe("article");
      expect(meta.openGraph?.url).toBe("/careers/techcorp/staff-platform-engineer");
    });

    it("renders server-side HTML with full job description and structured schema script", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/jobs/careers/")) {
          return {
            ok: true,
            json: async () => ({
              id: "job-1",
              title: "Staff Platform Engineer",
              slug: "staff-platform-engineer",
              department: "Infrastructure",
              location: "San Francisco, CA",
              type: "FULL_TIME",
              description: "Build robust cloud infrastructure across multiple cloud providers.",
              requirements: "5+ years of distributed systems experience",
              benefits: "Comprehensive health coverage, 401(k) matching",
              organization: { name: "TechCorp Global" },
            }),
          };
        }
        return { ok: false };
      });

      const element = await JobDetailPage({
        params: Promise.resolve({ orgSlug: "techcorp", jobSlug: "staff-platform-engineer" }),
      });
      const { container } = render(element);

      // Verify HTML content exists
      expect(container.innerHTML).toContain("Staff Platform Engineer");
      expect(container.innerHTML).toContain("TechCorp Global");
      expect(container.innerHTML).toContain("Build robust cloud infrastructure");
      expect(container.innerHTML).toContain("5+ years of distributed systems experience");

      // Verify JSON-LD Schema
      const scriptTag = container.querySelector('script[type="application/ld+json"]');
      expect(scriptTag).not.toBeNull();
      const schemaData = JSON.parse(scriptTag?.textContent || "{}");
      expect(schemaData["@type"]).toBe("JobPosting");
      expect(schemaData.title).toBe("Staff Platform Engineer");
    });

    it("renders JobClosed component without calling notFound when status is CLOSED", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/organizations/public/techcorp")) {
          return {
            ok: true,
            json: async () => ({ id: "org-1", name: "TechCorp Global", slug: "techcorp" }),
          };
        }
        if (url.includes("/jobs/careers/")) {
          return {
            ok: true,
            json: async () => ({
              id: "job-secops",
              title: "Information Security & SecOps Specialist",
              slug: "information-security-secops-specialist",
              department: "Security",
              location: "Remote",
              type: "FULL_TIME",
              status: "CLOSED",
              description: "Maintain security compliance and penetration testing.",
            }),
          };
        }
        return { ok: false };
      });

      const meta = await genJobMeta({
        params: Promise.resolve({ orgSlug: "techcorp", jobSlug: "information-security-secops-specialist" }),
      });
      expect(meta.title).toBe("[Closed] Information Security & SecOps Specialist at TechCorp Global | HaiHire Careers");

      const element = await JobDetailPage({
        params: Promise.resolve({ orgSlug: "techcorp", jobSlug: "information-security-secops-specialist" }),
      });
      const { container } = render(element);

      expect(container.innerHTML).toContain("job-closed");
      expect(container.innerHTML).toContain("Information Security &amp; SecOps Specialist");
    });

    it("triggers notFound when job status is DRAFT", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/organizations/public/techcorp")) {
          return {
            ok: true,
            json: async () => ({ id: "org-1", name: "TechCorp Global", slug: "techcorp" }),
          };
        }
        if (url.includes("/jobs/careers/")) {
          return {
            ok: true,
            json: async () => ({
              id: "job-draft",
              title: "Customer Success Lead",
              slug: "customer-success-lead",
              department: "Customer Success",
              location: "Remote",
              type: "FULL_TIME",
              status: "DRAFT",
              description: "Draft role description.",
            }),
          };
        }
        return { ok: false };
      });

      const meta = await genJobMeta({
        params: Promise.resolve({ orgSlug: "techcorp", jobSlug: "customer-success-lead" }),
      });
      expect(meta.title).toBe("Job Not Found | HaiHire Careers");

      await expect(
        JobDetailPage({
          params: Promise.resolve({ orgSlug: "techcorp", jobSlug: "customer-success-lead" }),
        }),
      ).rejects.toThrow();
    });
  });
});
