import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActivitiesService } from "./activities.service";

describe("ActivitiesService", () => {
  let service: ActivitiesService;
  let mockPrismaService: unknown;
  const inMemoryActivities: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    inMemoryActivities.length = 0;

    mockPrismaService = {
      activityLog: {
        create: vi
          .fn()
          .mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
            inMemoryActivities.push(data);
            return data;
          }),
        count: vi
          .fn()
          .mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
            return inMemoryActivities.filter((a) => {
              if (where.candidateId && a.candidateId !== where.candidateId)
                return false;
              if (where.applicationId && a.applicationId !== where.applicationId)
                return false;
              if (where.organizationId && a.organizationId !== where.organizationId)
                return false;
              return true;
            }).length;
          }),
        findMany: vi
          .fn()
          .mockImplementation(
            async ({
              where,
              skip = 0,
              take = 20,
            }: {
              where: Record<string, unknown>;
              skip?: number;
              take?: number;
            }) => {
              return inMemoryActivities
                .filter((a) => {
                  if (where.candidateId && a.candidateId !== where.candidateId)
                    return false;
                  if (where.applicationId && a.applicationId !== where.applicationId)
                    return false;
                  if (where.organizationId && a.organizationId !== where.organizationId)
                    return false;
                  return true;
                })
                .slice(skip, skip + take);
            },
          ),
      },
    };

    service = new ActivitiesService(mockPrismaService as never);
  });

  it("should create activity log and store JSON metadata", async () => {
    const activity = await service.createActivity({
      organizationId: "org-1",
      candidateId: "cand-1",
      type: "STAGE_CHANGED",
      title: "Stage changed",
      description: "Candidate moved to Interview stage",
      actorName: "John Recruiter",
      metadata: { fromStage: "APPLIED", toStage: "INTERVIEW" },
    });

    expect(activity).toBeDefined();
    expect(activity.organizationId).toBe("org-1");
    expect(activity.metadata).toBe(
      JSON.stringify({ fromStage: "APPLIED", toStage: "INTERVIEW" }),
    );
  });

  it("should paginate activities and parse JSON metadata safely", async () => {
    await service.createActivity({
      organizationId: "org-1",
      candidateId: "cand-1",
      type: "NOTE_ADDED",
      title: "Note 1",
      description: "Note description",
      actorName: "John",
      metadata: { note: "Great candidate" },
    });

    const result = await service.findByCandidate(
      "cand-1",
      "org-1",
      { page: 1, limit: 10 },
      "org-1",
    );

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.data[0].metadata).toEqual({ note: "Great candidate" });
  });
});
