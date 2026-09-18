import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActivitiesService } from "./activities.service";

describe("ActivitiesService", () => {
  let service: ActivitiesService;
  let mockPrismaService: any;
  const inMemoryActivities: any[] = [];

  beforeEach(() => {
    inMemoryActivities.length = 0;

    mockPrismaService = {
      db: {
        orm: {
          public: {
            ActivityLog: {
              create: vi.fn().mockImplementation(async (data) => {
                inMemoryActivities.push(data);
                return data;
              }),
              where: vi.fn().mockImplementation((predicateFn) => ({
                where: vi.fn().mockImplementation((predicateFn2) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return inMemoryActivities.filter((a) => {
                      const rec1 = {
                        candidateId: { eq: (val: string) => a.candidateId === val },
                        applicationId: { eq: (val: string) => a.applicationId === val },
                      };
                      const rec2 = {
                        organizationId: { eq: (val: string) => a.organizationId === val },
                      };
                      return predicateFn(rec1) && predicateFn2(rec2);
                    });
                  }),
                })),
                all: vi.fn().mockImplementation(async () => {
                  return inMemoryActivities.filter((a) => {
                    const rec = {
                      candidateId: { eq: (val: string) => a.candidateId === val },
                      applicationId: { eq: (val: string) => a.applicationId === val },
                    };
                    return predicateFn(rec);
                  });
                }),
              })),
            },
          },
        },
      },
    };

    service = new ActivitiesService(mockPrismaService);
  });

  it("should create activity log and store JSON metadata", async () => {
    const activity = await service.createActivity({
      organizationId: "org-1",
      candidateId: "cand-1",
      type: "STAGE_CHANGED",
      title: "Stage changed",
      description: "Moved to Interview",
      actorName: "HR",
      metadata: { fromStage: "APPLIED", toStage: "INTERVIEW" },
    });

    expect(activity).toBeDefined();
    expect(activity.candidateId).toBe("cand-1");
    expect(typeof activity.metadata).toBe("string");
  });

  it("should return paginated activities strictly as PaginatedResult", async () => {
    for (let i = 1; i <= 5; i++) {
      await service.createActivity({
        organizationId: "org-1",
        candidateId: "cand-1",
        type: "NOTE_ADDED",
        title: `Note ${i}`,
        description: `Description ${i}`,
        actorName: "HR",
      });
    }

    const result = await service.findByCandidate("cand-1", "org-1", {
      page: 1,
      limit: 2,
    });

    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.data.length).toBe(2);
  });
});
