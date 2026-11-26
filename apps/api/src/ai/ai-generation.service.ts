import { Inject, Injectable } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  SCREENING_QUESTION_TYPES,
  screeningQuestionSchema,
  type GenerateScreeningQuestionsInput,
  type GenerateScreeningQuestionsResponse,
  type ScreeningQuestion,
} from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import { callAiCompletion } from "./ai-provider.client";
import { AiSettingsService } from "./ai-settings.service";
import { parseJsonPayload, stripHtmlTags } from "./ai-text.util";

@Injectable()
export class AiGenerationService {
  constructor(
    @Inject(AiSettingsService)
    private readonly aiSettingsService: AiSettingsService,
  ) {}

  async generateScreeningQuestions(
    organizationId: string,
    dto: GenerateScreeningQuestionsInput,
  ): Promise<GenerateScreeningQuestionsResponse> {
    const config =
      await this.aiSettingsService.getActiveRuntimeConfig(organizationId);

    const plainDesc = stripHtmlTags(dto.description).slice(0, 6000);
    const languageLabel =
      dto.language === "en" ? "English" : "Vietnamese (Tiếng Việt)";

    const systemPrompt = [
      "You are an expert enterprise ATS recruitment assistant.",
      `Generate ${dto.count} concise, job-relevant applicant screening questions in ${languageLabel}.`,
      "Return ONLY valid JSON matching this exact structure:",
      '{"questions":[{"text":"...","type":"short_text","required":true,"options":["..."]}]}',
      `Allowed "type" values: ${SCREENING_QUESTION_TYPES.join(", ")}.`,
      'Include "options" (2 to 6 distinct strings) ONLY when "type" is "single_choice" or "multiple_choice".',
      "CRITICAL COMPLIANCE & SAFETY RULES:",
      "- Focus strictly on job-related skills, work eligibility/logistics, availability, and relevant experience described in the job posting.",
      "- NEVER ask about protected or sensitive personal traits: age/date of birth, gender, race/ethnicity, religion, marital or parental/pregnancy status, sexual orientation, disability/health status, or political beliefs.",
      "- Do NOT duplicate or paraphrase any existing questions provided in the prompt.",
    ].join("\n");

    const userPrompt = [
      `Job Title: ${dto.title}`,
      dto.department ? `Department: ${dto.department}` : "",
      dto.experienceLevel ? `Experience Level: ${dto.experienceLevel}` : "",
      dto.workplace ? `Workplace Type: ${dto.workplace}` : "",
      dto.existingQuestions.length > 0
        ? `Existing Questions (do not repeat): ${dto.existingQuestions.join(" | ")}`
        : "",
      `Job Description:\n${plainDesc}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const rawText = await callAiCompletion({
      provider: config.provider,
      modelId: config.modelId,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      jsonMode: true,
    });

    let decoded: unknown;
    try {
      decoded = parseJsonPayload(rawText);
    } catch {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "AI provider returned malformed JSON output.",
      );
    }

    const rawList = Array.isArray(decoded)
      ? decoded
      : decoded &&
          typeof decoded === "object" &&
          Array.isArray((decoded as { questions?: unknown }).questions)
        ? (decoded as { questions: unknown[] }).questions
        : [];

    const existingNormalized = new Set(
      dto.existingQuestions.map((q) => q.trim().toLowerCase()),
    );
    const seen = new Set<string>();
    const validQuestions: Array<Omit<ScreeningQuestion, "id">> = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      const parsed = screeningQuestionSchema.safeParse({
        id: `ai_${i + 1}`,
        text: typeof rec.text === "string" ? rec.text : "",
        type: rec.type,
        required: typeof rec.required === "boolean" ? rec.required : true,
        ...(Array.isArray(rec.options)
          ? {
              options: Array.from(
                new Set(
                  rec.options
                    .filter((o): o is string => typeof o === "string")
                    .map((o) => o.trim())
                    .filter(Boolean),
                ),
              ).slice(0, 10),
            }
          : {}),
      });
      if (!parsed.success) continue;

      const normText = parsed.data.text.trim().toLowerCase();
      if (existingNormalized.has(normText) || seen.has(normText)) continue;
      seen.add(normText);

      const isChoice =
        parsed.data.type === "single_choice" ||
        parsed.data.type === "multiple_choice";

      validQuestions.push({
        text: parsed.data.text,
        type: parsed.data.type,
        required: parsed.data.required,
        ...(isChoice && parsed.data.options
          ? { options: parsed.data.options }
          : {}),
      });

      if (validQuestions.length >= dto.count) break;
    }

    if (validQuestions.length === 0) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "AI provider could not produce any valid screening questions.",
      );
    }

    return {
      questions: validQuestions,
      provider: config.provider,
      modelId: config.modelId,
    };
  }
}
