import {
  createMockTable,
  createMockPrismaService,
} from "../test/helpers/prisma-composer-mock";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import {
  AppBadRequestException,
  AppForbiddenException,
} from "../common/app-exception";
import { InterviewsService } from "./interviews.service";
import { formatInterviewRecord } from "./constants";

describe("InterviewsService", () => {
  let service: InterviewsService;
  let mockPrismaService: unknown;
  interface MockInterview {
    id: string;
    applicationId: string;
    scheduledAt: Date;
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
    displayName?: string | null;
    email: string;
    phone: string;
  }

  interface MockJob {
    id: string;
    title: string;
    department: string;
    organizationId: string;
  }

  interface MockOrg {
    id: string;
    name: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    nameDisplayOrder?: string;
  }

  let mockInterviews: MockInterview[];
  let mockApps: MockApp[];
  let mockCandidates: MockCandidate[];
  let mockJobs: MockJob[];
  let mockOrgs: MockOrg[];
  let mockEmailService: {
    getTemplateByType: ReturnType<typeof vi.fn>;
    sendEmail: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockInterviews = [
      {
        id: "intv-1",
        applicationId: "app-1",
        scheduledAt: new Date("2026-09-20T10:00:00Z"),
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
        displayName: null,
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

    mockOrgs = [
      { id: "org-1", name: "Org 1" },
      { id: "org-2", name: "Org 2" },
    ];

    const interviewTable = createMockTable(mockInterviews);
    const appTable = createMockTable(mockApps);
    const candidateTable = createMockTable(mockCandidates);
    const jobTable = createMockTable(mockJobs);
    const orgTable = createMockTable(mockOrgs);

    mockPrismaService = createMockPrismaService({
      interview: interviewTable,
      application: appTable,
      candidate: candidateTable,
      job: jobTable,
      organization: orgTable,
    });
    const mockActivitiesService = {
      createActivity: vi.fn().mockResolvedValue({}),
      findByCandidate: vi.fn().mockResolvedValue([]),
    };

    mockEmailService = {
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
    await expect(service.findOne("non-existent")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should create a new interview and advance application stage to INTERVIEW", async () => {
    mockApps[0].stage = "APPLIED";
    const created = await service.create({
      applicationId: "app-1",
      scheduledAt: "2026-09-25T14:00:00.000Z",
      type: "CULTURE_FIT",
      format: "ZOOM",
      linkOrLocation: "https://zoom.us/test",
      interviewer: "HR Manager",
      round: 2,
    });

    expect(created.type).toBe("CULTURE_FIT");
    expect(mockApps[0].stage).toBe("INTERVIEW");
  });

  it("should throw AppBadRequestException when scheduling interview for a rejected application", async () => {
    mockApps[0].stage = "REJECTED";
    await expect(
      service.create({
        applicationId: "app-1",
        scheduledAt: "2026-09-25T14:00:00.000Z",
        type: "TECHNICAL",
        interviewer: "Lead Engineer",
      }),
    ).rejects.toThrow(AppBadRequestException);
  });

  it("should throw AppForbiddenException when scheduling interview across different organizations", async () => {
    mockApps[0].stage = "APPLIED";
    await expect(
      service.create(
        {
          applicationId: "app-1",
          scheduledAt: "2026-09-25T14:00:00.000Z",
          type: "TECHNICAL",
          interviewer: "Lead Engineer",
        },
        "different-org-id",
      ),
    ).rejects.toThrow(AppForbiddenException);
  });

  it("should not overwrite stage if application is already in OFFER stage", async () => {
    mockApps[0].stage = "OFFER";
    await service.create({
      applicationId: "app-1",
      scheduledAt: "2026-09-25T14:00:00.000Z",
      type: "FINAL_ROUND",
      interviewer: "Director",
    });
    expect(mockApps[0].stage).toBe("OFFER");
  });

  it("should throw AppForbiddenException when accessing an interview belonging to another organization", async () => {
    await expect(service.findOne("intv-1", "other-org")).rejects.toThrow(
      AppForbiddenException,
    );
  });

  it("should allow findOne when tenant organization matches", async () => {
    const res = await service.findOne("intv-1", "org-1");
    expect(res.id).toBe("intv-1");
  });

  it("should update an existing interview", async () => {
    const updated = await service.update("intv-1", {
      scheduledAt: "2026-09-20T11:30:00.000Z",
      notes: "Updated notes",
    });

    expect(updated.scheduledAt).toBe("2026-09-20T11:30:00.000Z");
    expect(updated.notes).toBe("Updated notes");
  });

  it("should throw AppForbiddenException when updating an interview from another organization", async () => {
    await expect(
      service.update(
        "intv-1",
        {
          scheduledAt: "2026-09-20T11:30:00.000Z",
        },
        "other-org",
      ),
    ).rejects.toThrow(AppForbiddenException);
  });

  it("should throw AppForbiddenException when deleting an interview from another organization", async () => {
    await expect(service.remove("intv-1", "other-org")).rejects.toThrow(
      AppForbiddenException,
    );
  });

  it("should delete an interview", async () => {
    const res = await service.remove("intv-1", "org-1");
    expect(res.success).toBe(true);
    expect(mockInterviews).toHaveLength(0);
  });

  it("formats invitation email date/time in org timezone/format and candidate name using nameDisplayOrder", async () => {
    mockOrgs[0] = {
      id: "org-1",
      name: "HaiHire Corp",
      timezone: "Asia/Ho_Chi_Minh",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12H",
      nameDisplayOrder: "LAST_FIRST",
    };
    mockCandidates[0] = {
      ...mockCandidates[0],
      firstName: "An",
      lastName: "Nguyễn Văn",
      displayName: null,
      name: "An Nguyễn Văn",
    };
    mockEmailService.getTemplateByType.mockResolvedValueOnce({
      enabled: true,
      subject: "Mời phỏng vấn",
      body: "Body",
    });

    await service.create(
      {
        applicationId: "app-1",
        scheduledAt: "2026-10-20T18:30:00.000Z", // 2026-10-21 01:30 AM in Asia/Ho_Chi_Minh
        type: "TECHNICAL",
        format: "MEET",
        interviewer: "Lead Engineer",
        sendInvitationEmail: true,
      },
      "org-1",
    );

    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    const [emailPayload] = mockEmailService.sendEmail.mock.calls[0];
    expect(emailPayload.recipientName).toBe("Nguyễn Văn An");
    expect(emailPayload.variables).toMatchObject({
      candidate_name: "Nguyễn Văn An",
      interview_date: "21/10/2026",
      interview_time: "1:30 AM",
    });
  });

  describe("formatInterviewRecord", () => {
    it("should serialize scheduledAt to UTC ISO string and parse JSON scorecard", () => {
      const raw = {
        id: "intv-test",
        applicationId: "app-test",
        scheduledAt: new Date("2026-10-06T09:30:00.000Z"),
        type: "TECHNICAL",
        format: "MEET",
        linkOrLocation: "https://meet.google.com/test",
        interviewer: "Alice Recruiter",
        round: 1,
        scorecard: JSON.stringify({ overallRating: 4, recommendation: "YES" }),
        notes: "Good candidate",
      };

      const result = formatInterviewRecord(raw);
      expect(result.scheduledAt).toBe("2026-10-06T09:30:00.000Z");
      expect(result).not.toHaveProperty("date");
      expect(result).not.toHaveProperty("time");
      expect(result.scorecard).toEqual({
        overallRating: 4,
        recommendation: "YES",
      });
      expect(result.interviewer).toBe("Alice Recruiter");
    });

    it("should handle null scorecard cleanly", () => {
      const raw = {
        id: "intv-test-2",
        applicationId: "app-test",
        scheduledAt: new Date("2026-10-07T14:00:00.000Z"),
        type: "CULTURE_FIT",
        format: "OFFICE",
        linkOrLocation: "Room 101",
        interviewer: "Bob Manager",
        round: 2,
        scorecard: null,
        notes: null,
      };

      const result = formatInterviewRecord(raw);
      expect(result.scheduledAt).toBe("2026-10-07T14:00:00.000Z");
      expect(result).not.toHaveProperty("date");
      expect(result).not.toHaveProperty("time");
      expect(result.scorecard).toBeNull();
      expect(result.notes).toBeNull();
    });
  });
});
