import { Inject, Injectable } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  JOB_SCORING_CATEGORIES,
  SCREENING_QUESTION_TYPES,
  jobScoringCriterionSchema,
  screeningQuestionSchema,
  type GenerateScoringCriteriaInput,
  type GenerateScoringCriteriaResponse,
  type GenerateScreeningQuestionsInput,
  type GenerateScreeningQuestionsResponse,
  type JobScoringCriterion,
  type ScreeningQuestion,
} from "@haihire/shared";
import { AppBadRequestException } from "../common/app-exception";
import { AiGatewayService } from "./ai-gateway.service";
import { parseJsonPayload, stripHtmlTags } from "./ai-text.util";

@Injectable()
export class AiGenerationService {
  constructor(
    @Inject(AiGatewayService)
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  async generateScreeningQuestions(
    organizationId: string,
    dto: GenerateScreeningQuestionsInput,
  ): Promise<GenerateScreeningQuestionsResponse> {
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

    const gatewayResult = await this.aiGatewayService.execute(
      organizationId,
      "SCREENING_QUESTIONS",
      {
        systemPrompt,
        userPrompt,
        maxTokens: 2048,
        jsonMode: true,
      },
    );

    let decoded: unknown;
    try {
      decoded = parseJsonPayload(gatewayResult.text);
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
      provider: gatewayResult.provider,
      modelId: gatewayResult.modelId,
    };
  }

  async generateScoringCriteria(
    organizationId: string,
    dto: GenerateScoringCriteriaInput,
  ): Promise<GenerateScoringCriteriaResponse> {
    const plainDesc = stripHtmlTags(dto.description).slice(0, 6000);
    const languageLabel =
      dto.language === "en" ? "English" : "Vietnamese (Tiếng Việt)";

    const systemPrompt = [
      "You are an expert enterprise ATS hiring calibration architect.",
      `Generate ${dto.count} clear, role-specific candidate evaluation criteria in ${languageLabel} based on the job description.`,
      "Return ONLY valid JSON matching this exact structure:",
      '{"criteria":[{"title":"...","category":"Technical","description":"...","weight":70,"key":"system_design"}]}',
      `Allowed "category" values: ${JOB_SCORING_CATEGORIES.join(", ")}.`,
      '"weight" must be an integer between 10 and 100 reflecting relative importance (10-100).',
      '"key" must be a concise snake_case identifier using lowercase ASCII letters, digits, and underscores (max 40 chars).',
      '"description" must describe concrete evidence recruiters or AI should verify in a candidate CV or answers.',
      "CRITICAL COMPLIANCE & SAFETY RULES:",
      "- Evaluate only job-relevant competencies, domain skills, practical experience, and collaboration.",
      "- NEVER create criteria about age, gender, ethnicity, marital status, or protected personal traits.",
      "- Do NOT duplicate or paraphrase existing criteria titles if provided.",
    ].join("\n");

    const userPrompt = [
      `Job Title: ${dto.title}`,
      dto.department ? `Department: ${dto.department}` : "",
      dto.experienceLevel ? `Experience Level: ${dto.experienceLevel}` : "",
      dto.workplace ? `Workplace Type: ${dto.workplace}` : "",
      dto.existingTitles.length > 0
        ? `Existing Criteria (do not repeat): ${dto.existingTitles.join(" | ")}`
        : "",
      `Job Description:\n${plainDesc}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const gatewayResult = await this.aiGatewayService.execute(
      organizationId,
      "SCORING_CRITERIA",
      {
        systemPrompt,
        userPrompt,
        maxTokens: 2048,
        jsonMode: true,
      },
    );

    let decoded: unknown;
    try {
      decoded = parseJsonPayload(gatewayResult.text);
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
          Array.isArray((decoded as { criteria?: unknown }).criteria)
        ? (decoded as { criteria: unknown[] }).criteria
        : [];

    const existingNormalized = new Set(
      dto.existingTitles.map((t) => t.trim().toLowerCase()),
    );
    const seenTitles = new Set<string>();
    const seenKeys = new Set<string>();
    const validCriteria: JobScoringCriterion[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      const rawTitle = typeof rec.title === "string" ? rec.title.trim() : "";
      const rawKey = typeof rec.key === "string" ? rec.key : rawTitle;
      const normalizedKeyBase =
        rawKey
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 40) || `criterion_${i + 1}`;
      let uniqueKey = normalizedKeyBase;
      let suffix = 2;
      while (seenKeys.has(uniqueKey)) {
        uniqueKey = `${normalizedKeyBase.slice(0, 36)}_${suffix++}`;
      }

      const rawWeight =
        typeof rec.weight === "number" && Number.isFinite(rec.weight)
          ? Math.max(5, Math.min(100, Math.round(rec.weight / 5) * 5))
          : 50;

      const parsed = jobScoringCriterionSchema.safeParse({
        id: `crit_ai_${Date.now()}_${i + 1}`,
        title: rawTitle,
        category: rec.category,
        description:
          typeof rec.description === "string" ? rec.description.trim() : "",
        weight: rawWeight,
        maxScore: 10,
        key: uniqueKey,
      });
      if (!parsed.success) continue;

      const normTitle = parsed.data.title.toLowerCase();
      if (existingNormalized.has(normTitle) || seenTitles.has(normTitle)) {
        continue;
      }
      seenTitles.add(normTitle);
      seenKeys.add(uniqueKey);
      validCriteria.push(parsed.data);

      if (validCriteria.length >= dto.count) break;
    }

    if (validCriteria.length === 0) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_GENERATION_FAILED,
        "AI provider could not produce any valid scoring criteria.",
      );
    }

    return {
      criteria: validCriteria,
      provider: gatewayResult.provider,
      modelId: gatewayResult.modelId,
    };
  }
}
