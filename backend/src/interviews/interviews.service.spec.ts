import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { InterviewsService } from "./interviews.service";

describe("InterviewsService", () => {
  let service: InterviewsService;
  let mockPrismaService: unknown;
  interface MockInterview {
    id: string;
    applicationId: string;
    date: string;
    time: string;
    type: string;
    format: string;
    linkOrLocation: string;
    interviewer: string;
    round: number;
    scorecard: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  interface MockApp {
    id: string;
    candidateId: string;
    jobId: string;
    stage: string;
    matchScore: number;
    notes: string | null;
  }

  interface MockCandidate {
    id: string;
    organizationId: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }

  interface MockJob {
    id: string;
    title: string;
    department: string;
    organizationId: string;
  }

  let mockInterviews: MockInterview[];
  let mockApps: MockApp[];
  let mockCandidates: MockCandidate[];
  let mockJobs: MockJob[];

  beforeEach(() => {
    mockInterviews = [
      {
        id: "intv-1",
        applicationId: "app-1",
        date: "2026-09-20",
        time: "10:00",
        type: "Technical",
        format: "MEET",
        linkOrLocation: "https://meet.google.com/test",
        interviewer: "Lead Engineer",
        round: 1,
        scorecard: null,
        notes: "Good candidate",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockApps = [
      {
        id: "app-1",
        candidateId: "cand-1",
        jobId: "job-1",
        stage: "INTERVIEW",
        matchScore: 85,
        notes: null,
      },
    ];

    mockCandidates = [
      {
        id: "cand-1",
        organizationId: "org-1",
        name: "Alice Johnson",
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        phone: "123456789",
      },
    ];

    mockJobs = [
      {
        id: "job-1",
        title: "Frontend Developer",
        department: "Engineering",
        organizationId: "org-1",
      },
    ];

    const createSelectBuilder = <T extends object>(dataList: T[]) => () => {
      const builder = {
        where: vi.fn().mockImplementation((predicateFn) => ({
          all: vi.fn().mockImplementation(async () => {
            return dataList.filter((item) => {
              const rec = item as Record<string, string>;
              const mockRecord = {
                id: {
                  eq: (t: string) => rec.id === t,
                  in: (arr: string[]) => arr.includes(rec.id),
                },
                organizationId: {
                  eq: (t: string) => rec.organizationId === t,
                  in: (arr: string[]) => arr.includes(rec.organizationId),
                },
                candidateId: {
                  eq: (t: string) => rec.candidateId === t,
                  in: (arr: string[]) => arr.includes(rec.candidateId),
                },
                jobId: {
                  eq: (t: string) => rec.jobId === t,
                  in: (arr: string[]) => arr.includes(rec.jobId),
                },
                applicationId: {
                  eq: (t: string) => rec.applicationId === t,
                  in: (arr: string[]) => arr.includes(rec.applicationId),
                },
              };
              return predicateFn(mockRecord);
            });
          }),
        })),
      };
      return builder;
    };

    mockPrismaService = {
      db: {
        orm: {
          public: {
            Interview: {
              all: vi.fn().mockImplementation(async () => mockInterviews.map((i) => ({ ...i }))),
              where: vi.fn().mockImplementation((predicateFn) => ({
                all: vi.fn().mockImplementation(async () => {
                  return mockInterviews.filter((i) => {
                    const mockRecord = {
                      id: {
                        eq: (t: string) => i.id === t,
                        in: (arr: string[]) => arr.includes(i.id),
                      },
                      applicationId: {
                        eq: (t: string) => i.applicationId === t,
                        in: (arr: string[]) => arr.includes(i.applicationId),
                      },
                    };
                    return predicateFn(mockRecord);
                  }).map((x) => ({ ...x }));
                }),
                first: vi.fn().mockImplementation(async () => {
                  const match = mockInterviews.find((i) => {
                    const mockRecord = { id: { eq: (target: string) => i.id === target } };
                    return predicateFn(mockRecord);
                  });
                  return match ? { ...match } : null;
                }),
                update: vi.fn().mockImplementation(async (updates) => {
                  const match = mockInterviews.find((i) => {
                    const mockRecord = { id: { eq: (target: string) => i.id === target } };
                    return predicateFn(mockRecord);
                  });
                  if (match) {
                    Object.assign(match, updates);
                    return { ...match };
                  }
                  return null;
                }),
                delete: vi.fn().mockImplementation(async () => {
                  const idx = mockInterviews.findIndex((i) => {
                    const mockRecord = { id: { eq: (target: string) => i.id === target } };
                    return predicateFn(mockRecord);
                  });
                  if (idx !== -1) mockInterviews.splice(idx, 1);
                  return { count: 1 };
                }),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                const newIntv = { ...data, createdAt: new Date(), updatedAt: new Date() };
                mockInterviews.push(newIntv);
                return newIntv;
              }),
            },
            Application: {
              select: vi.fn().mockImplementation(createSelectBuilder(mockApps)),
              where: vi.fn().mockImplementation((predicateFn) => ({
                first: vi.fn().mockImplementation(async () => {
                  const match = mockApps.find((a) => {
                    const mockRecord = { id: { eq: (target: string) => a.id === target } };
                    return predicateFn(mockRecord);
                  });
                  return match ? { ...match } : null;
                }),
                update: vi.fn().mockImplementation(async (updates) => {
                  const match = mockApps.find((a) => {
                    const mockRecord = { id: { eq: (target: string) => a.id === target } };
                    return predicateFn(mockRecord);
                  });
                  if (match) {
                    Object.assign(match, updates);
                    return { ...match };
                  }
                  return null;
                }),
              })),
            },
            Candidate: {
              select: vi.fn().mockImplementation(createSelectBuilder(mockCandidates)),
              where: vi.fn().mockImplementation((predicateFn) => ({
                first: vi.fn().mockImplementation(async () => {
                  const match = mockCandidates.find((c) => {
                    const mockRecord = { id: { eq: (target: string) => c.id === target } };
                    return predicateFn(mockRecord);
                  });
                  return match ? { ...match } : null;
                }),
              })),
            },
            Job: {
              select: vi.fn().mockImplementation(createSelectBuilder(mockJobs)),
              where: vi.fn().mockImplementation((predicateFn) => ({
                first: vi.fn().mockImplementation(async () => {
                  const match = mockJobs.find((j) => {
                    const mockRecord = { id: { eq: (target: string) => j.id === target } };
                    return predicateFn(mockRecord);
                  });
                  return match ? { ...match } : null;
                }),
              })),
            },
          },
        },
      },
    };

    const mockActivitiesService = {
      createActivity: vi.fn().mockResolvedValue({}),
      findByCandidate: vi.fn().mockResolvedValue([]),
    };

    const mockEmailService = {
      getTemplateByType: vi.fn().mockResolvedValue(null),
      sendEmail: vi.fn().mockResolvedValue({}),
    };

    service = new InterviewsService(
      mockPrismaService as never,
      mockActivitiesService as never,
      mockEmailService as never,
    );
  });

  it("should return all interviews enriched with application, candidate, and job info", async () => {
    const list = await service.findAll({ organizationId: "org-1" });
    expect(list.data).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(list.data[0].id).toBe("intv-1");
    expect(list.data[0].candidateName).toBe("Alice Johnson");
    expect(list.data[0].jobTitle).toBe("Frontend Developer");
  });

  it("should find an interview by id", async () => {
    const intv = await service.findOne("intv-1");
    expect(intv.id).toBe("intv-1");
    expect(intv.candidateName).toBe("Alice Johnson");
  });

  it("should throw NotFoundException when interview id does not exist", async () => {
    await expect(service.findOne("non-existent")).rejects.toThrow(NotFoundException);
  });

  it("should create a new interview and advance application stage to INTERVIEW", async () => {
    mockApps[0].stage = "APPLIED";
    const created = await service.create({
      applicationId: "app-1",
      date: "2026-09-25",
      time: "14:00",
      type: "CULTURE_FIT",
      format: "ZOOM",
      linkOrLocation: "https://zoom.us/test",
      interviewer: "HR Manager",
      round: 2,
    });

    expect(created.type).toBe("CULTURE_FIT");
    expect(mockApps[0].stage).toBe("INTERVIEW");
  });

  it("should update an existing interview", async () => {
    const updated = await service.update("intv-1", {
      time: "11:30",
      notes: "Updated notes",
    });

    expect(updated.time).toBe("11:30");
    expect(updated.notes).toBe("Updated notes");
  });

  it("should delete an interview", async () => {
    const res = await service.remove("intv-1");
    expect(res.success).toBe(true);
    expect(mockInterviews).toHaveLength(0);
  });
});
