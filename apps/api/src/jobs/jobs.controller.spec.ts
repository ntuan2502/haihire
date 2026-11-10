import { describe, expect, it, vi } from "vitest";
import { Role } from "@haihire/shared";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import type { PermissionResolverService } from "../auth/permission-resolver.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createMockPrismaService,
  createMockTable,
} from "../test/helpers/prisma-composer-mock";

describe("JobsController public directory and detail privacy", () => {
  const makeService = () =>
    new JobsService(
      createMockPrismaService({
        job: createMockTable([
          {
            id: "job-a",
            organizationId: "org-a",
            title: "Public A",
            status: "PUBLISHED",
            deletedAt: null,
          },
          {
            id: "job-b",
            organizationId: "org-b",
            title: "Public B",
            status: "PUBLISHED",
            deletedAt: null,
          },
          {
            id: "draft-b",
            organizationId: "org-b",
            title: "Private",
            status: "DRAFT",
            deletedAt: null,
          },
        ]),
        organization: createMockTable([
          { id: "org-a", name: "A", slug: "a" },
          { id: "org-b", name: "B", slug: "b" },
        ]),
        application: createMockTable([
          {
            id: "app-1",
            jobId: "job-a",
            candidateId: "candidate-1",
            stage: "APPLIED",
            notes: "Private notes",
            resumeUrl: "private-cv",
          },
        ]),
        candidate: createMockTable([
          {
            id: "candidate-1",
            organizationId: "org-a",
            name: "Alice",
            email: "alice@example.com",
            resumeUrl: "private-cv",
          },
        ]),
        interview: createMockTable([
          {
            id: "interview-1",
            applicationId: "app-1",
            scorecard: '{"rating":4}',
            notes: "Private feedback",
          },
        ]),
      }) as unknown as PrismaService,
    );

  it("public directory lists published jobs across organizations", async () => {
    const result = await new JobsController(makeService()).findPublic("1000");
    expect(result.data.map((job) => job.id).sort()).toEqual(["job-a", "job-b"]);
    expect(result.data.every((job) => job.applicationsCount === 0)).toBe(true);
  });

  it("MEMBER sees basic applicants without CVs, notes or scorecards", async () => {
    const result = await new JobsController(makeService()).findOne("job-a", {
      user: { organizationId: "org-a", role: Role.MEMBER },
    });
    expect(result.applications[0]).toMatchObject({
      candidateName: "Alice",
      stage: "APPLIED",
    });
    expect(JSON.stringify(result.applications)).not.toContain("Private");
    expect(JSON.stringify(result.applications)).not.toContain("private-cv");
    expect(JSON.stringify(result.applications)).not.toContain("rating");
  });

  it("honors tenant permission overrides when projecting details", async () => {
    const resolvePermission = vi.fn().mockResolvedValue(false);
    const resolver = {
      resolvePermission,
    } as unknown as PermissionResolverService;
    const result = await new JobsController(makeService(), resolver).findOne(
      "job-a",
      {
        user: { organizationId: "org-a", role: Role.RECRUITER },
      },
    );
    expect(resolvePermission).toHaveBeenCalledWith(
      "org-a",
      Role.RECRUITER,
      "candidate:view",
    );
    expect(result.applications[0]).not.toHaveProperty("notes");
  });
});
