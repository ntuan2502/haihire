import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createMockTable,
  createMockPrismaService,
} from "../../test/helpers/prisma-composer-mock";
import { InterviewsQueryService } from "./interviews-query.service";

describe("InterviewsQueryService", () => {
  const fixedNow = new Date("2026-11-18T07:00:00.000Z");
  let service: InterviewsQueryService;
  let interviewTable: ReturnType<typeof createMockTable>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    const mockInterviews = [
      {
        id: "intv-past-today",
        organizationId: "org-1",
        applicationId: "app-1",
        scheduledAt: new Date("2026-11-18T02:00:00.000Z"),
        type: "HR_SCREENING",
        format: "MEET",
        linkOrLocation: "https://meet.google.com/past",
        interviewer: "Recruiter A",
        round: 1,
        scorecard: null,
        notes: null,
        createdAt: new Date("2026-11-17T08:00:00.000Z"),
        updatedAt: new Date("2026-11-17T08:00:00.000Z"),
        application: {
          id: "app-1",
          organizationId: "org-1",
          candidateId: "cand-1",
          jobId: "job-1",
          stage: "INTERVIEW",
          candidate: {
            id: "cand-1",
            organizationId: "org-1",
            name: "Alice Nguyen",
            firstName: "Alice",
            lastName: "Nguyen",
            email: "alice@example.com",
            phone: null,
          },
          job: {
            id: "job-1",
            title: "Frontend Engineer",
            organizationId: "org-1",
          },
        },
      },
      {
        id: "intv-future-today",
        organizationId: "org-1",
        applicationId: "app-2",
        scheduledAt: new Date("2026-11-18T09:00:00.000Z"),
        type: "TECHNICAL",
        format: "MEET",
        linkOrLocation: "https://meet.google.com/future",
        interviewer: "Lead B",
        round: 1,
        scorecard: null,
        notes: null,
        createdAt: new Date("2026-11-17T09:00:00.000Z"),
        updatedAt: new Date("2026-11-17T09:00:00.000Z"),
        application: {
          id: "app-2",
          organizationId: "org-1",
          candidateId: "cand-2",
          jobId: "job-1",
          stage: "INTERVIEW",
          candidate: {
            id: "cand-2",
            organizationId: "org-1",
            name: "Bob Tran",
            firstName: "Bob",
            lastName: "Tran",
            email: "bob@example.com",
            phone: null,
          },
          job: {
            id: "job-1",
            title: "Frontend Engineer",
            organizationId: "org-1",
          },
        },
      },
    ];

    interviewTable = createMockTable(mockInterviews);
    const orgTable = createMockTable([{ id: "org-1", name: "HaiHire Corp" }]);

    const prismaMock = createMockPrismaService({
      interview: interviewTable,
      organization: orgTable,
    });

    service = new InterviewsQueryService(prismaMock as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters tab=UPCOMING by exact current timestamp so earlier same-day meetings are excluded", async () => {
    const result = await service.findAll({
      organizationId: "org-1",
      tab: "UPCOMING",
    });

    expect(result.data.map((i) => i.id)).toEqual(["intv-future-today"]);
    expect(result.total).toBe(1);
    expect(interviewTable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledAt: { gte: fixedNow },
        }),
      }),
    );
  });

  it("filters tab=AWAITING strictly before current timestamp with null scorecard", async () => {
    await service.findAll({
      organizationId: "org-1",
      tab: "AWAITING",
    });

    expect(interviewTable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          scheduledAt: { lt: fixedNow },
          scorecard: { equals: Prisma.DbNull },
        },
      }),
    );
    expect(interviewTable.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        scheduledAt: { lt: fixedNow },
        scorecard: { equals: Prisma.DbNull },
      },
    });
  });
});
