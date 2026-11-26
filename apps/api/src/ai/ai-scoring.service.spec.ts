import { Readable } from "node:stream";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MinioService } from "../minio/minio.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  createMockPrismaService,
  createMockTable,
} from "../test/helpers/prisma-composer-mock";
import {
  AiScoringService,
  computeScoringInputHash,
  computeWeightedOverallScore,
} from "./ai-scoring.service";
import type { AiSettingsService } from "./ai-settings.service";

const { mockExtractPdfTextFromBuffer } = vi.hoisted(() => ({
  mockExtractPdfTextFromBuffer: vi.fn(),
}));

vi.mock("./pdf-text.util", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pdf-text.util")>();
  return {
    ...actual,
    extractPdfTextFromBuffer: mockExtractPdfTextFromBuffer,
  };
});

describe("AiScoringService", () => {
  let service: AiScoringService;
  let appTable: ReturnType<typeof createMockTable>;
  let evalTable: ReturnType<typeof createMockTable>;
  let jobTable: ReturnType<typeof createMockTable>;
  let candidateTable: ReturnType<typeof createMockTable>;
  let orgTable: ReturnType<typeof createMockTable>;
  let aiSettingTable: ReturnType<typeof createMockTable>;
  let mockSettingsService: {
    getActiveRuntimeConfig: ReturnType<typeof vi.fn>;
  };
  let mockMinio: {
    getObjectStream: ReturnType<typeof vi.fn>;
  };
  let mockEvents: { emit: ReturnType<typeof vi.fn> };
  let mockQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    appTable = createMockTable([
      {
        id: "app-1",
        organizationId: "org-1",
        jobId: "job-1",
        candidateId: "cand-1",
        resumeUrl: "tenants/org-1/resumes/cv.pdf",
        resumeFileName: "alice-cv.pdf",
        coverLetter: "Passionate TypeScript & React engineer.",
        screeningAnswers: [
          {
            questionId: "q1",
            questionText: "Years of TypeScript?",
            type: "number",
            answer: 5,
          },
        ],
        matchScore: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: "app-2",
        organizationId: "org-1",
        jobId: "job-1",
        candidateId: "cand-2",
        resumeUrl: null,
        resumeFileName: null,
        coverLetter: null,
        screeningAnswers: null,
        matchScore: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    evalTable = createMockTable([]);
    jobTable = createMockTable([
      {
        id: "job-1",
        organizationId: "org-1",
        title: "Senior Frontend Engineer",
        department: "Engineering",
        location: "Remote",
        experienceLevel: "SENIOR",
        workplace: "REMOTE",
        description: "<p>React, TypeScript, Next.js required.</p>",
        deletedAt: null,
      },
    ]);
    candidateTable = createMockTable([
      {
        id: "cand-1",
        organizationId: "org-1",
        deletedAt: null,
      },
      {
        id: "cand-2",
        organizationId: "org-1",
        deletedAt: null,
      },
    ]);
    orgTable = createMockTable([
      {
        id: "org-1",
        defaultLanguage: "en",
      },
    ]);
    aiSettingTable = createMockTable([
      {
        id: "ai-set-1",
        organizationId: "org-1",
        provider: "GEMINI",
        modelId: "gemini-4-hydrogen",
        encryptedApiKey: "enc-key",
        isEnabled: true,
        autoScoreApplications: false,
      },
    ]);

    const mockPrisma = createMockPrismaService({
      application: appTable,
      applicationAiEvaluation: evalTable,
      job: jobTable,
      candidate: candidateTable,
      organization: orgTable,
      organizationAiSetting: aiSettingTable,
    }) as unknown as PrismaService;

    mockSettingsService = {
      getActiveRuntimeConfig: vi.fn().mockResolvedValue({
        provider: "GEMINI",
        modelId: "gemini-4-hydrogen",
        apiKey: "AIza-test-key",
        baseUrl: null,
      }),
    };

    mockMinio = {
      getObjectStream: vi
        .fn()
        .mockResolvedValue(Readable.from([Buffer.from("%PDF-1.4 sample")])),
    };
    mockEvents = { emit: vi.fn() };
    mockQueue = { add: vi.fn().mockResolvedValue({ id: "job-q-1" }) };

    service = new AiScoringService(
      mockPrisma,
      mockSettingsService as unknown as AiSettingsService,
      mockMinio as unknown as MinioService,
      mockEvents as never,
      mockQueue as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computes deterministic weighted scores and stable input hashes", () => {
    const scoreWithScreening = computeWeightedOverallScore(
      {
        skills: { score: 90, note: "Strong TS" },
        experience: { score: 80, note: "5 yrs" },
        screening: { score: 100, note: "Matches all" },
        presentation: { score: 70, note: "Clean" },
      },
      true,
    );
    // 90*0.4 + 80*0.3 + 100*0.2 + 70*0.1 = 36 + 24 + 20 + 7 = 87
    expect(scoreWithScreening).toBe(87);

    const scoreWithoutScreening = computeWeightedOverallScore(
      {
        skills: { score: 90, note: "Strong TS" },
        experience: { score: 80, note: "5 yrs" },
        screening: { score: 0, note: "None" },
        presentation: { score: 70, note: "Clean" },
      },
      false,
    );
    // 90*0.5 + 80*0.4 + 70*0.1 = 45 + 32 + 7 = 84
    expect(scoreWithoutScreening).toBe(84);

    const h1 = computeScoringInputHash({
      jobTitle: "Engineer",
      jobDescription: "<p>React</p>",
      resumeUrl: "cv.pdf",
    });
    const h2 = computeScoringInputHash({
      jobTitle: "Engineer",
      jobDescription: "React",
      resumeUrl: "cv.pdf",
    });
    expect(h1).toBe(h2);
  });

  it("scores application via extracted PDF text, stores calibrated breakdown & syncs matchScore", async () => {
    const longCv = "Senior TypeScript and React engineer. ".repeat(15);
    mockExtractPdfTextFromBuffer.mockResolvedValueOnce({
      text: longCv,
      truncated: false,
      rawLength: longCv.length,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      breakdown: {
                        skills: {
                          score: 90,
                          note: "Strong React and TypeScript.",
                        },
                        experience: {
                          score: 80,
                          note: "5 years frontend engineering.",
                        },
                        screening: {
                          score: 100,
                          note: "Answered 5 years TS experience.",
                        },
                        presentation: {
                          score: 80,
                          note: "Clear CV and cover letter.",
                        },
                      },
                      summary: "Strong match for Senior Frontend Engineer.",
                      strengths: ["5 years TypeScript"],
                      gaps: ["Limited backend scale details"],
                      suggestedQuestions: ["Tell us about state management."],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const evaluation = await service.scoreApplicationNow("org-1", "app-1");

    // 90*0.4 + 80*0.3 + 100*0.2 + 80*0.1 = 88
    expect(evaluation.status).toBe("COMPLETED");
    expect(evaluation.overallScore).toBe(88);
    expect(evaluation.warningCode).toBeNull();
    expect(evaluation.isStale).toBe(false);
    expect((appTable.store[0] as { matchScore: number }).matchScore).toBe(88);
    expect(mockEvents.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "APPLICATIONS_CHANGED",
        organizationId: "org-1",
      }),
    );
  });

  it("falls back to native PDF inline attachment when scanned PDF yields <200 chars", async () => {
    mockExtractPdfTextFromBuffer.mockResolvedValueOnce({
      text: "",
      truncated: false,
      rawLength: 12,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      breakdown: {
                        skills: { score: 75, note: "Good JS" },
                        experience: { score: 70, note: "3 years" },
                        screening: { score: 80, note: "Good answers" },
                        presentation: { score: 75, note: "Visual CV" },
                      },
                      summary: "Solid candidate evaluated from scanned PDF.",
                      strengths: ["Relevant project history"],
                      gaps: [],
                      suggestedQuestions: ["Verify TS depth"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const evaluation = await service.scoreApplicationNow("org-1", "app-1");

    expect(evaluation.status).toBe("COMPLETED");
    expect(evaluation.warningCode).toBeNull();
    const requestBody = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.contents[0].parts[0].inlineData.mimeType).toBe(
      "application/pdf",
    );
  });

  it("respects autoScoreApplications opt-in and enqueues batch scoring per job", async () => {
    await service.maybeAutoEnqueueOnApply("org-1", "app-1");
    expect(mockQueue.add).not.toHaveBeenCalled();

    const batch = await service.enqueueJobPendingScores("org-1", "job-1", 20);
    expect(batch.enqueued).toBe(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });
});
