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
  computeWeightedCriteriaScore,
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
        scoringConfig: {
          autoScore: false,
          criteria: [
            {
              id: "c1",
              key: "react_ts",
              title: "React & TypeScript Mastery",
              category: "Technical",
              description: "Deep production mastery of React and TypeScript.",
              weight: 70,
              maxScore: 10,
            },
            {
              id: "c2",
              key: "product_thinking",
              title: "Product Thinking",
              category: "Experience",
              description: "End-to-end UX ownership.",
              weight: 30,
              maxScore: 10,
            },
          ],
        },
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

  it("computes deterministic weighted criteria scores and stable input hashes", () => {
    const weighted = computeWeightedCriteriaScore([
      { weight: 70, score: 10, maxScore: 10 },
      { weight: 30, score: 8, maxScore: 10 },
    ]);
    // 100*0.7 + 80*0.3 = 70 + 24 = 94
    expect(weighted).toBe(94);

    const h1 = computeScoringInputHash({
      jobTitle: "Engineer",
      jobDescription: "<p>React</p>",
      resumeUrl: "cv.pdf",
      scoringConfig: { criteria: [], autoScore: false },
    });
    const h2 = computeScoringInputHash({
      jobTitle: "Engineer",
      jobDescription: "React",
      resumeUrl: "cv.pdf",
      scoringConfig: { criteria: [], autoScore: false },
    });
    expect(h1).toBe(h2);
  });

  it("scores application per configured criterion and syncs matchScore", async () => {
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
                      criteria: [
                        {
                          key: "react_ts",
                          score: 10,
                          confidence: 95,
                          evidence:
                            "5 years building enterprise React and TypeScript platforms.",
                          strengths: ["5 years TS", "Next.js App Router"],
                          gaps: [],
                        },
                        {
                          key: "product_thinking",
                          score: 8,
                          confidence: 80,
                          evidence: "Led SaaS onboarding redesign.",
                          strengths: ["Reduced onboarding friction"],
                          gaps: ["No B2B analytics metrics listed"],
                        },
                      ],
                      summary: "Excellent frontend match across all criteria.",
                      suggestedQuestions: [
                        "Walk through your Next.js caching strategy.",
                      ],
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

    // Weighted: 100*0.7 + 80*0.3 = 94
    expect(evaluation.status).toBe("COMPLETED");
    expect(evaluation.overallScore).toBe(94);
    expect(evaluation.criteriaResults).toHaveLength(2);
    expect(evaluation.criteriaResults?.[0]).toMatchObject({
      key: "react_ts",
      score: 10,
      maxScore: 10,
      confidence: 95,
      confidenceLevel: "high",
      normalizedWeight: 70,
    });
    expect(evaluation.warningCode).toBeNull();
    expect(evaluation.isStale).toBe(false);
    expect((appTable.store[0] as { matchScore: number }).matchScore).toBe(94);
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
                      criteria: [
                        {
                          key: "react_ts",
                          score: 8,
                          confidence: 70,
                          evidence: "Visual CV shows React projects.",
                          strengths: ["React experience"],
                          gaps: [],
                        },
                        {
                          key: "product_thinking",
                          score: 7,
                          confidence: 65,
                          evidence: "Owned UI delivery.",
                          strengths: ["Cross-team work"],
                          gaps: [],
                        },
                      ],
                      summary: "Solid candidate evaluated from scanned PDF.",
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

  it("respects autoScore on both org setting and per-job scoringConfig, and supports job batch scoring", async () => {
    await service.maybeAutoEnqueueOnApply("org-1", "app-1");
    expect(mockQueue.add).not.toHaveBeenCalled();

    // Enabling per-job autoScore triggers background enqueue cleanly
    (
      jobTable.store[0] as { scoringConfig: { autoScore: boolean } }
    ).scoringConfig.autoScore = true;
    await service.maybeAutoEnqueueOnApply("org-1", "app-1");
    expect(mockQueue.add).toHaveBeenCalledTimes(1);

    // Reset evaluation status and test job batch enqueue
    evalTable.store.splice(0, evalTable.store.length);
    mockQueue.add.mockClear();
    const batch = await service.enqueueJobPendingScores("org-1", "job-1", 20);
    expect(batch.enqueued).toBe(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });

  it("executes external AI HTTP fetch outside active withTenantRls DB transactions", async () => {
    const rlsPrisma = createMockPrismaService({
      application: appTable,
      applicationAiEvaluation: evalTable,
      job: jobTable,
      candidate: candidateTable,
      organization: orgTable,
      organizationAiSetting: aiSettingTable,
    }) as unknown as PrismaService & {
      withTenantRls: (
        orgId: string,
        fn: (tx: PrismaService) => Promise<unknown>,
      ) => Promise<unknown>;
    };

    let activeRlsTxDepth = 0;
    let txPhaseCount = 0;
    let fetchDepthObserved = -1;

    rlsPrisma.withTenantRls = vi.fn(async (_orgId, fn) => {
      txPhaseCount += 1;
      activeRlsTxDepth += 1;
      try {
        return await fn(rlsPrisma);
      } finally {
        activeRlsTxDepth -= 1;
      }
    });

    const isolatedService = new AiScoringService(
      rlsPrisma,
      mockSettingsService as unknown as AiSettingsService,
      mockMinio as unknown as MinioService,
      mockEvents as never,
      mockQueue as never,
    );

    mockExtractPdfTextFromBuffer.mockResolvedValueOnce({
      text: "Senior TypeScript engineer. ".repeat(15),
      truncated: false,
      rawLength: 420,
    });

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
      fetchDepthObserved = activeRlsTxDepth;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      criteria: [
                        {
                          key: "react_ts",
                          score: 9,
                          confidence: 90,
                          evidence: "5 years React & TS.",
                          strengths: ["TypeScript"],
                          gaps: [],
                        },
                        {
                          key: "product_thinking",
                          score: 8,
                          confidence: 80,
                          evidence: "Built SaaS dashboard.",
                          strengths: ["Product focus"],
                          gaps: [],
                        },
                      ],
                      summary: "Strong candidate.",
                      suggestedQuestions: ["Tell us about scaling React apps."],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const evaluation = await isolatedService.scoreApplicationNow(
      "org-1",
      "app-1",
    );

    expect(evaluation.status).toBe("COMPLETED");
    expect(txPhaseCount).toBe(2);
    expect(fetchDepthObserved).toBe(0);
  });
});
