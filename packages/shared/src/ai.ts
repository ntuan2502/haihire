import { z } from "zod";
import {
  type ScreeningQuestion,
  screeningQuestionSchema,
} from "./application-form";

export const AI_PROVIDERS = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "OPENROUTER",
  "OPENAI_COMPATIBLE",
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiModelBadge = "recommended" | "fast" | "powerful" | "low_cost";

export interface AiModelPreset {
  id: string;
  label: string;
  badge?: AiModelBadge;
}

export interface AiProviderPreset {
  id: AiProvider;
  label: string;
  defaultModelId: string;
  defaultBaseUrl?: string;
  apiKeyUrl: string;
  modelsUrl?: string;
  requiresApiKey: boolean;
  models: AiModelPreset[];
  otherModels: AiModelPreset[];
}

export const AI_PROVIDER_PRESETS: Record<AiProvider, AiProviderPreset> = {
  OPENAI: {
    id: "OPENAI",
    label: "OpenAI",
    defaultModelId: "gpt-6.2-sol",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    modelsUrl: "https://platform.openai.com/docs/models",
    requiresApiKey: true,
    models: [
      { id: "gpt-6.2-sol", label: "GPT-6.2 Sol", badge: "recommended" },
      { id: "gpt-6.2-astra", label: "GPT-6.2 Astra", badge: "powerful" },
      { id: "gpt-5-mini", label: "GPT-5 mini", badge: "fast" },
      { id: "gpt-5-nano", label: "GPT-5 nano", badge: "low_cost" },
    ],
    otherModels: [
      { id: "gpt-6-luna", label: "GPT-6 Luna" },
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  ANTHROPIC: {
    id: "ANTHROPIC",
    label: "Anthropic",
    defaultModelId: "claude-sonnet-5-5",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    modelsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    requiresApiKey: true,
    models: [
      {
        id: "claude-sonnet-5-5",
        label: "Claude Sonnet 5.5",
        badge: "recommended",
      },
      {
        id: "claude-opus-5-5",
        label: "Claude Opus 5.5",
        badge: "powerful",
      },
      {
        id: "claude-fable-5-2",
        label: "Claude Fable 5.2",
        badge: "fast",
      },
      {
        id: "claude-haiku-5-5",
        label: "Claude Haiku 5.5",
        badge: "low_cost",
      },
    ],
    otherModels: [
      { id: "claude-mythos-5-2", label: "Claude Mythos 5.2" },
      { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
  },
  GEMINI: {
    id: "GEMINI",
    label: "Google AI (Gemini)",
    defaultModelId: "gemini-4-hydrogen",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    modelsUrl: "https://ai.google.dev/gemini-api/docs/models",
    requiresApiKey: true,
    models: [
      {
        id: "gemini-4-hydrogen",
        label: "Gemini 4 Hydrogen",
        badge: "recommended",
      },
      {
        id: "gemini-4-carbon",
        label: "Gemini 4 Carbon",
        badge: "powerful",
      },
      { id: "gemini-4-neon", label: "Gemini 4 Neon", badge: "fast" },
      {
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        badge: "low_cost",
      },
    ],
    otherModels: [
      { id: "gemini-4-argon", label: "Gemini 4 Argon" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
    ],
  },
  OPENROUTER: {
    id: "OPENROUTER",
    label: "OpenRouter",
    defaultModelId: "google/gemini-4-hydrogen",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    apiKeyUrl: "https://openrouter.ai/settings/keys",
    modelsUrl: "https://openrouter.ai/models",
    requiresApiKey: true,
    models: [
      {
        id: "google/gemini-4-hydrogen",
        label: "Gemini 4 Hydrogen",
        badge: "recommended",
      },
      {
        id: "openai/gpt-6.2-sol",
        label: "GPT-6.2 Sol",
        badge: "powerful",
      },
      {
        id: "anthropic/claude-sonnet-5-5",
        label: "Claude Sonnet 5.5",
        badge: "fast",
      },
      {
        id: "openai/gpt-5-nano",
        label: "GPT-5 nano",
        badge: "low_cost",
      },
    ],
    otherModels: [
      { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { id: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5" },
      { id: "anthropic/claude-haiku-5-5", label: "Claude Haiku 5.5" },
      { id: "openai/gpt-5-mini", label: "GPT-5 mini" },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B",
      },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    ],
  },
  OPENAI_COMPATIBLE: {
    id: "OPENAI_COMPATIBLE",
    label: "OpenAI-Compatible",
    defaultModelId: "gpt-oss-20b",
    defaultBaseUrl: "http://localhost:11434/v1",
    apiKeyUrl: "https://ollama.com/library",
    modelsUrl: "https://ollama.com/library",
    requiresApiKey: false,
    models: [
      { id: "gpt-oss-20b", label: "GPT-OSS 20B", badge: "recommended" },
      { id: "gpt-oss-120b", label: "GPT-OSS 120B", badge: "powerful" },
      { id: "qwen2.5", label: "Qwen 2.5", badge: "fast" },
      { id: "llama3.3", label: "Llama 3.3", badge: "low_cost" },
    ],
    otherModels: [
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
      { id: "gemma3", label: "Gemma 3" },
      { id: "mistral", label: "Mistral" },
      { id: "phi4", label: "Phi-4" },
    ],
  },
};

function isValidHttpEndpointUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const upsertAiSettingSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    modelId: z.string().trim().min(1, "Model ID is required").max(150),
    apiKey: z.string().trim().max(500).optional(),
    baseUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    isEnabled: z.boolean().default(true),
    autoScoreApplications: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.provider === "OPENAI_COMPATIBLE") {
      if (!val.baseUrl || !isValidHttpEndpointUrl(val.baseUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseUrl"],
          message:
            "Valid HTTP(S) base URL is required for OpenAI-Compatible providers",
        });
      }
    } else if (val.baseUrl && !isValidHttpEndpointUrl(val.baseUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseUrl"],
        message: "Base URL must be a valid HTTP(S) URL",
      });
    }
  });

export type UpsertAiSettingInput = z.infer<typeof upsertAiSettingSchema>;

export const testAiConnectionSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    modelId: z.string().trim().min(1, "Model ID is required").max(150),
    apiKey: z.string().trim().max(500).optional(),
    baseUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .superRefine((val, ctx) => {
    if (val.provider === "OPENAI_COMPATIBLE") {
      if (!val.baseUrl || !isValidHttpEndpointUrl(val.baseUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseUrl"],
          message:
            "Valid HTTP(S) base URL is required for OpenAI-Compatible providers",
        });
      }
    }
  });

export type TestAiConnectionInput = z.infer<typeof testAiConnectionSchema>;

export const generateScreeningQuestionsSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(200),
  description: z
    .string()
    .trim()
    .min(1, "Job description is required")
    .max(15000),
  department: z.string().trim().max(120).optional(),
  experienceLevel: z.string().trim().max(60).optional(),
  workplace: z.string().trim().max(60).optional(),
  language: z.enum(["vi", "en"]).default("vi"),
  count: z.number().int().min(1).max(8).default(5),
  existingQuestions: z.array(z.string().trim().max(500)).max(30).default([]),
});

export type GenerateScreeningQuestionsInput = z.infer<
  typeof generateScreeningQuestionsSchema
>;

export interface OrganizationAiSettingResponse {
  id: string;
  organizationId: string;
  provider: AiProvider;
  modelId: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  isEnabled: boolean;
  autoScoreApplications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAiStatusResponse {
  configured: boolean;
  enabled: boolean;
  autoScoreApplications: boolean;
  provider?: AiProvider;
  modelId?: string;
}

export interface TestAiConnectionResponse {
  ok: boolean;
  latencyMs: number;
  model: string;
}

export interface GenerateScreeningQuestionsResponse {
  questions: Array<Omit<ScreeningQuestion, "id">>;
  provider: AiProvider;
  modelId: string;
}

export const AI_SCORE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export type AiScoreStatus = (typeof AI_SCORE_STATUSES)[number];

export const AI_SCORE_WARNING_CODES = [
  "NO_CV",
  "CV_UNREADABLE_SCANNED",
  "CV_TRUNCATED",
] as const;

export type AiScoreWarningCode = (typeof AI_SCORE_WARNING_CODES)[number];

export const aiScoreCriterionSchema = z.object({
  score: z.number().min(0).max(100),
  note: z.string().trim().min(1).max(400),
});

export const aiScoreBreakdownSchema = z.object({
  skills: aiScoreCriterionSchema,
  experience: aiScoreCriterionSchema,
  screening: aiScoreCriterionSchema,
  presentation: aiScoreCriterionSchema,
});

export const aiScoreRawOutputSchema = z.object({
  breakdown: aiScoreBreakdownSchema,
  summary: z.string().trim().min(1).max(1500),
  strengths: z.array(z.string().trim().min(1).max(400)).min(1).max(5),
  gaps: z.array(z.string().trim().min(1).max(400)).max(5).default([]),
  suggestedQuestions: z
    .array(z.string().trim().min(1).max(400))
    .max(4)
    .default([]),
});

export const batchAiScoreSchema = z.object({
  limit: z.number().int().min(1).max(20).default(20),
});

export type BatchAiScoreInput = z.infer<typeof batchAiScoreSchema>;
export type AiScoreCriterion = z.infer<typeof aiScoreCriterionSchema>;
export type AiScoreBreakdown = z.infer<typeof aiScoreBreakdownSchema>;
export type AiScoreRawOutput = z.infer<typeof aiScoreRawOutputSchema>;

export interface ApplicationAiEvaluation {
  id: string;
  applicationId: string;
  status: AiScoreStatus;
  overallScore: number | null;
  breakdown: AiScoreBreakdown | null;
  summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  suggestedQuestions: string[] | null;
  warningCode: AiScoreWarningCode | string | null;
  cvExtractedChars: number | null;
  provider: AiProvider | null;
  modelId: string | null;
  errorMessage: string | null;
  isStale?: boolean;
  scoredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchAiScoreResponse {
  enqueued: number;
  skipped: number;
  applicationIds: string[];
}

export { screeningQuestionSchema };
