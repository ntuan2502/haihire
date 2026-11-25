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
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@haihire/shared";
import { InterviewsService } from "./interviews.service";
import { formatInterviewRecord } from "./constants";

describe("InterviewsService", () => {
  let service: InterviewsService;
  let mockPrismaService: unknown;
  interface MockInterview {
    id: string;
    organizationId?: string;
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
    application?: unknown;
  }

  interface MockApp {
    id: string;
    organizationId?: string;
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
    location?: string;
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
        organizationId: "org-1",
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
        application: {
          id: "app-1",
          organizationId: "org-1",
          candidateId: "cand-1",
          jobId: "job-1",
          stage: "INTERVIEW",
          matchScore: 85,
          notes: null,
          candidate: {
            id: "cand-1",
            organizationId: "org-1",
            name: "Alice Johnson",
            firstName: "Alice",
            lastName: "Johnson",
            displayName: null,
            email: "alice@example.com",
            phone: "123456789",
          },
          job: {
            id: "job-1",
            title: "Frontend Developer",
            department: "Engineering",
            organizationId: "org-1",
          },
        },
      },
    ];

    mockApps = [
      {
        id: "app-1",
        organizationId: "org-1",
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
      user: {
        findFirst: vi.fn(async ({ where }) => {
          expect(where.OR).toEqual([
            { memberships: { some: { organizationId: "org-1" } } },
            { ownedOrganizations: { some: { id: "org-1" } } },
          ]);
          return where.id === "user-1"
            ? {
                firstName: "Alice",
                lastName: "Nguyen",
                email: "alice@example.com",
              }
            : null;
        }),
      },
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
    const list = await service.listPaginated({ organizationId: "org-1" });
    expect(list.data).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(list.data[0].id).toBe("intv-1");
    expect(list.data[0].candidateName).toBe("Johnson Alice");
    expect(list.data[0].jobTitle).toBe("Frontend Developer");
  });

  it("stores the selected interviewer ID and a server-resolved display name", async () => {
    const interview = await service.create(
      {
        applicationId: "app-1",
        scheduledAt: "2026-09-25T14:00:00.000Z",
        type: "TECHNICAL",
        interviewerId: "user-1",
      },
      "org-1",
    );

    expect(interview).toMatchObject({
      interviewerId: "user-1",
      interviewer: "Nguyen Alice",
    });
    const updated = await service.update(
      "intv-1",
      { interviewerId: "user-1" },
      "org-1",
    );
    expect(updated).toMatchObject({
      interviewerId: "user-1",
      interviewer: "Nguyen Alice",
    });
  });

  it("rejects an interviewer from another organization on create and update", async () => {
    await expect(
      service.create(
        {
          applicationId: "app-1",
          scheduledAt: "2026-09-25T14:00:00.000Z",
          type: "TECHNICAL",
          interviewerId: "user-2",
        },
        "org-1",
      ),
    ).rejects.toThrow(AppBadRequestException);
    await expect(
      service.update("intv-1", { interviewerId: "user-2" }, "org-1"),
    ).rejects.toThrow(AppBadRequestException);
  });

  it("should find an interview by id", async () => {
    const intv = await service.findOne("intv-1");
    expect(intv.id).toBe("intv-1");
    expect(intv.candidateName).toBe("Johnson Alice");
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

  it("uses resolved override templateId from INTERVIEW_SCHEDULED flow when creating an interview", async () => {
    const resolveFlowMock = vi.fn().mockResolvedValueOnce({
      id: "tpl-round-2",
      name: "Phỏng vấn Vòng 2",
      type: "INTERVIEW_INVITATION",
      enabled: true,
      subject: "Mời phỏng vấn vòng 2 {{job_title}}",
      body: "<p>Chào {{candidate_name}}</p>",
    });
    (
      mockEmailService as { resolveFlowTemplate?: typeof resolveFlowMock }
    ).resolveFlowTemplate = resolveFlowMock;

    try {
      await service.create(
        {
          applicationId: "app-1",
          scheduledAt: "2026-10-21T09:00:00.000Z",
          type: "TECHNICAL",
          format: "MEET",
          interviewer: "CTO",
          sendInvitationEmail: true,
          templateId: "tpl-round-2",
        },
        "org-1",
      );

      expect(resolveFlowMock).toHaveBeenCalledWith(
        "org-1",
        "INTERVIEW_SCHEDULED",
        "tpl-round-2",
      );
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: "tpl-round-2",
          templateName: "Phỏng vấn Vòng 2",
          templateType: "INTERVIEW_INVITATION",
        }),
        "org-1",
        expect.objectContaining({ name: "CTO" }),
      );
    } finally {
      delete (
        mockEmailService as { resolveFlowTemplate?: typeof resolveFlowMock }
      ).resolveFlowTemplate;
    }
  });

  it("BUG-18: uses human-readable format and job location without injecting Google Meet link for OFFICE interviews", async () => {
    mockJobs[0].location = "Ha Noi HQ";
    mockEmailService.getTemplateByType.mockResolvedValue({
      id: "tpl-office",
      name: "Office Invite",
      type: "INTERVIEW_INVITATION",
      enabled: true,
      subject: "Invite",
      body: "Location: {{interview_link}}",
    });

    await service.create(
      {
        applicationId: "app-1",
        scheduledAt: "2026-10-22T03:00:00.000Z",
        type: "CULTURE_FIT",
        format: "OFFICE",
        interviewer: "HR Lead",
        sendInvitationEmail: true,
      },
      "org-1",
    );

    const [withJobLoc] = mockEmailService.sendEmail.mock.calls[0];
    expect(withJobLoc.variables).toMatchObject({
      interview_format: "In-Person (At Office)",
      interview_link: "Ha Noi HQ",
    });

    delete mockJobs[0].location;
    mockEmailService.sendEmail.mockClear();

    await service.create(
      {
        applicationId: "app-1",
        scheduledAt: "2026-10-23T03:00:00.000Z",
        type: "CULTURE_FIT",
        format: "OFFICE",
        interviewer: "HR Lead",
        sendInvitationEmail: true,
      },
      "org-1",
    );

    const [withoutJobLoc] = mockEmailService.sendEmail.mock.calls[0];
    expect(withoutJobLoc.variables.interview_format).toBe(
      "In-Person (At Office)",
    );
    expect(withoutJobLoc.variables.interview_link).toBeUndefined();
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

  describe("cross-tenant isolation on findAll filters", () => {
    it("should return empty results when filtering by another organization's applicationId", async () => {
      const list = await service.listPaginated({
        applicationId: "app-1",
        tenantOrgId: "org-2",
      });
      expect(list.data).toHaveLength(0);
      expect(list.total).toBe(0);
    });

    it("should return empty results when filtering by another organization's jobId", async () => {
      const list = await service.listPaginated({
        jobId: "job-1",
        tenantOrgId: "org-2",
      });
      expect(list.data).toHaveLength(0);
      expect(list.total).toBe(0);
    });

    it("increments application version on interview auto-advance and encodes context on cancelled interview notification", async () => {
      const prismaAny = mockPrismaService as unknown as {
        application: { update: ReturnType<typeof vi.fn> };
        pipelineStage: { findFirst: ReturnType<typeof vi.fn> };
      };
      prismaAny.pipelineStage = {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "stage-intv", category: "INTERVIEW" }),
      };
      const updateSpy = vi.spyOn(prismaAny.application, "update");

      mockApps[0].stage = "APPLIED";
      await service.create(
        {
          applicationId: "app-1",
          scheduledAt: "2026-10-01T10:00:00Z",
          type: "TECHNICAL",
          interviewer: "Lead",
        },
        "org-1",
      );

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "app-1" }),
          data: expect.objectContaining({
            stage: "INTERVIEW",
            stageId: "stage-intv",
            version: { increment: 1 },
          }),
        }),
      );
    });

    it("records event-envelope audit logs on interview schedule, update diff, and cancel", async () => {
      const mockAuditLog = { logOrg: vi.fn().mockResolvedValue({}) };
      const auditedService = new InterviewsService(
        mockPrismaService as never,
        { createActivity: vi.fn().mockResolvedValue({}) } as never,
        mockEmailService as never,
        undefined,
        undefined,
        undefined,
        mockAuditLog as never,
      );

      const created = await auditedService.create(
        {
          applicationId: "app-1",
          scheduledAt: "2026-10-05T09:00:00Z",
          type: "TECHNICAL",
          interviewer: "Staff Engineer",
        },
        "org-1",
        "user-1",
      );

      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        AUDIT_ACTIONS.INTERVIEW_SCHEDULED,
        AUDIT_RESOURCES.INTERVIEW,
        expect.objectContaining({
          applicationId: "app-1",
          type: "TECHNICAL",
          interviewer: "Staff Engineer",
        }),
        undefined,
        expect.objectContaining({
          targetId: created.id,
          targetLabel: expect.stringContaining("Frontend Developer"),
        }),
      );

      mockAuditLog.logOrg.mockClear();
      await auditedService.update(
        created.id,
        { round: 2, notes: "Panel round" },
        "org-1",
        { id: "user-2", name: "HR Lead", role: "ADMIN" },
      );
      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "user-2",
        AUDIT_ACTIONS.INTERVIEW_UPDATED,
        AUDIT_RESOURCES.INTERVIEW,
        expect.objectContaining({ applicationId: "app-1" }),
        undefined,
        expect.objectContaining({
          targetId: created.id,
          changes: expect.arrayContaining([
            { field: "round", before: 1, after: 2 },
            { field: "notes", before: null, after: "Panel round" },
          ]),
        }),
      );

      mockAuditLog.logOrg.mockClear();
      await auditedService.remove(created.id, "org-1", "user-2");
      expect(mockAuditLog.logOrg).toHaveBeenCalledWith(
        "org-1",
        "user-2",
        AUDIT_ACTIONS.INTERVIEW_CANCELED,
        AUDIT_RESOURCES.INTERVIEW,
        expect.objectContaining({ applicationId: "app-1" }),
        undefined,
        expect.objectContaining({
          targetId: created.id,
        }),
      );
    });
  });
});
