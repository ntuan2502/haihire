import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppBadRequestException } from "../common/app-exception";
import { AiGenerationService } from "./ai-generation.service";
import type { AiSettingsService } from "./ai-settings.service";

describe("AiGenerationService", () => {
  let service: AiGenerationService;
  let mockSettingsService: {
    getActiveRuntimeConfig: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSettingsService = {
      getActiveRuntimeConfig: vi.fn().mockResolvedValue({
        provider: "GEMINI",
        modelId: "gemini-2.5-flash",
        apiKey: "AIza-fake-key",
        baseUrl: null,
      }),
    };
    service = new AiGenerationService(
      mockSettingsService as unknown as AiSettingsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses structured JSON questions, filters invalid/duplicate entries, and supports all 9 field types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
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
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await service.generateScreeningQuestions("org-1", {
      title: "Senior Frontend Engineer",
      description: "<p>Build React and TypeScript applications.</p>",
      language: "en",
      count: 5,
      existingQuestions: ["Existing question?"],
    });

    expect(res.provider).toBe("GEMINI");
    expect(res.modelId).toBe("gemini-2.5-flash");
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

  it("throws AppBadRequestException when LLM returns invalid JSON", async () => {
    mockSettingsService.getActiveRuntimeConfig.mockResolvedValueOnce({
      provider: "ANTHROPIC",
      modelId: "claude-3-5-haiku-latest",
      apiKey: "sk-ant-test",
      baseUrl: null,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "not valid json at all" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      service.generateScreeningQuestions("org-1", {
        title: "Backend Engineer",
        description: "<p>NestJS</p>",
        language: "en",
        count: 5,
        existingQuestions: [],
      }),
    ).rejects.toBeInstanceOf(AppBadRequestException);
  });
});
