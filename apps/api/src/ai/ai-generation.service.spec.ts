import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppBadRequestException } from "../common/app-exception";
import type { AiGatewayService } from "./ai-gateway.service";
import { AiGenerationService } from "./ai-generation.service";

describe("AiGenerationService", () => {
  let service: AiGenerationService;
  let mockGatewayService: {
    execute: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGatewayService = {
      execute: vi.fn(),
    };
    service = new AiGenerationService(
      mockGatewayService as unknown as AiGatewayService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses structured JSON questions via SCREENING_QUESTIONS gateway route and filters duplicates", async () => {
    mockGatewayService.execute.mockResolvedValueOnce({
      text: JSON.stringify({
        questions: [
          {
            text: "How many years of TypeScript experience do you have?",
            type: "number",
            required: true,
          },
          {
            text: "Portfolio or GitHub URL",
            type: "url",
            required: false,
          },
          {
            text: "Preferred work model",
            type: "single_choice",
            required: true,
            options: ["Remote", "Hybrid"],
          },
          {
            text: "Existing question?",
            type: "short_text",
            required: true,
          },
          {
            text: "Invalid single choice",
            type: "single_choice",
            required: true,
            options: ["Only one option"],
          },
        ],
      }),
      provider: "GEMINI",
      modelId: "gemini-4-hydrogen",
      connectionId: "conn-1",
      connectionName: "Primary Gemini",
      attempts: 1,
    });

    const res = await service.generateScreeningQuestions("org-1", {
      title: "Senior Frontend Engineer",
      description: "<p>Build React and TypeScript applications.</p>",
      language: "en",
      count: 5,
      existingQuestions: ["Existing question?"],
    });

    expect(mockGatewayService.execute).toHaveBeenCalledWith(
      "org-1",
      "SCREENING_QUESTIONS",
      expect.objectContaining({
        jsonMode: true,
        maxTokens: 2048,
      }),
    );
    expect(res.provider).toBe("GEMINI");
    expect(res.modelId).toBe("gemini-4-hydrogen");
    expect(res.questions).toEqual([
      {
        text: "How many years of TypeScript experience do you have?",
        type: "number",
        required: true,
      },
      {
        text: "Portfolio or GitHub URL",
        type: "url",
        required: false,
      },
      {
        text: "Preferred work model",
        type: "single_choice",
        required: true,
        options: ["Remote", "Hybrid"],
      },
    ]);
  });

  it("routes scoring criteria generation via SCORING_CRITERIA and throws on malformed JSON", async () => {
    mockGatewayService.execute.mockResolvedValueOnce({
      text: "not valid json at all",
      provider: "ANTHROPIC",
      modelId: "claude-sonnet-5-5",
      connectionId: "conn-2",
      connectionName: "Claude",
      attempts: 1,
    });

    await expect(
      service.generateScoringCriteria("org-1", {
        title: "Backend Engineer",
        description: "<p>NestJS</p>",
        language: "en",
        count: 5,
        existingTitles: [],
      }),
    ).rejects.toBeInstanceOf(AppBadRequestException);

    expect(mockGatewayService.execute).toHaveBeenCalledWith(
      "org-1",
      "SCORING_CRITERIA",
      expect.objectContaining({
        jsonMode: true,
      }),
    );
  });
});
