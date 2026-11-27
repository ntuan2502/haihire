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

export const AI_FEATURE_KEYS = [
  "APPLICATION_SCORING",
  "SCREENING_QUESTIONS",
  "SCORING_CRITERIA",
] as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[number];

export const AI_PROXY_MODES = ["SINGLE", "FAILOVER", "LOAD_BALANCE"] as const;

export type AiProxyMode = (typeof AI_PROXY_MODES)[number];

export const AI_FEATURE_ROUTE_MODES = [
  "INHERIT_DEFAULT",
  "SINGLE",
  "FAILOVER",
  "LOAD_BALANCE",
] as const;

export type AiFeatureRouteMode = (typeof AI_FEATURE_ROUTE_MODES)[number];

export const AI_CONNECTION_STATUSES = ["UNTESTED", "HEALTHY", "ERROR"] as const;

export type AiConnectionStatus = (typeof AI_CONNECTION_STATUSES)[number];

export const AI_ROUTE_TEST_TARGETS = [
  ...AI_FEATURE_KEYS,
  "GLOBAL_DEFAULT",
] as const;

export type AiRouteTestTarget = (typeof AI_ROUTE_TEST_TARGETS)[number];

export const MAX_AI_CONNECTIONS_PER_ORG = 20;

const optionalBaseUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const patchBaseUrlSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))
  .optional();

function validateProviderBaseUrl(
  provider: AiProvider | undefined,
  baseUrl: string | null | undefined,
  ctx: z.RefinementCtx,
  requireOpenAiCompatibleBaseUrl: boolean,
): void {
  if (provider === "OPENAI_COMPATIBLE" && requireOpenAiCompatibleBaseUrl) {
    if (!baseUrl || !isValidHttpEndpointUrl(baseUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseUrl"],
        message:
          "Valid HTTP(S) base URL is required for OpenAI-Compatible providers",
      });
    }
    return;
  }

  if (baseUrl && !isValidHttpEndpointUrl(baseUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["baseUrl"],
      message: "Base URL must be a valid HTTP(S) URL",
    });
  }
}

export const createAiConnectionSchema = z
  .object({
    name: z.string().trim().min(1, "Connection name is required").max(80),
    provider: z.enum(AI_PROVIDERS),
    defaultModelId: z.string().trim().min(1, "Model ID is required").max(150),
    apiKey: z.string().trim().max(500).optional(),
    baseUrl: optionalBaseUrlSchema,
    isEnabled: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    validateProviderBaseUrl(val.provider, val.baseUrl, ctx, true);
  });

export type CreateAiConnectionInput = z.infer<typeof createAiConnectionSchema>;

export const updateAiConnectionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Connection name is required")
      .max(80)
      .optional(),
    provider: z.enum(AI_PROVIDERS).optional(),
    defaultModelId: z
      .string()
      .trim()
      .min(1, "Model ID is required")
      .max(150)
      .optional(),
    apiKey: z.string().trim().max(500).optional(),
    baseUrl: patchBaseUrlSchema,
    isEnabled: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    validateProviderBaseUrl(
      val.provider,
      val.baseUrl,
      ctx,
      val.baseUrl !== undefined,
    );
  });

export type UpdateAiConnectionInput = z.infer<typeof updateAiConnectionSchema>;

export const aiRouteTargetSchema = z.object({
  connectionId: z.string().uuid(),
  modelId: z
    .string()
    .trim()
    .max(150)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  weight: z.number().int().min(1).max(100).default(1),
});

export type AiRouteTarget = z.infer<typeof aiRouteTargetSchema>;

export function normalizeAiRouteTargets(raw: unknown): AiRouteTarget[] {
  if (!Array.isArray(raw)) return [];
  const parsed: AiRouteTarget[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const res = aiRouteTargetSchema.safeParse(item);
    if (!res.success || seen.has(res.data.connectionId)) continue;
    seen.add(res.data.connectionId);
    parsed.push(res.data);
  }
  return parsed;
}

export const updateAiPolicySchema = z.object({
  isEnabled: z.boolean(),
  autoScoreApplications: z.boolean(),
  defaultRouteMode: z.enum(AI_PROXY_MODES),
  defaultRouteTargets: z.array(aiRouteTargetSchema).max(20),
});

export type UpdateAiPolicyInput = z.infer<typeof updateAiPolicySchema>;

export const featureRouteConfigInputSchema = z.object({
  feature: z.enum(AI_FEATURE_KEYS),
  isEnabled: z.boolean(),
  mode: z.enum(AI_FEATURE_ROUTE_MODES),
  targets: z.array(aiRouteTargetSchema).max(20),
});

export const updateAiFeatureRoutesSchema = z.object({
  routes: z.array(featureRouteConfigInputSchema).min(1).max(10),
});

export type UpdateAiFeatureRoutesInput = z.infer<
  typeof updateAiFeatureRoutesSchema
>;

export const testAiConnectionSchema = z
  .object({
    connectionId: z.string().uuid().optional(),
    provider: z.enum(AI_PROVIDERS),
    modelId: z.string().trim().min(1, "Model ID is required").max(150),
    apiKey: z.string().trim().max(500).optional(),
    baseUrl: optionalBaseUrlSchema,
  })
  .superRefine((val, ctx) => {
    validateProviderBaseUrl(val.provider, val.baseUrl, ctx, true);
  });

export type TestAiConnectionInput = z.infer<typeof testAiConnectionSchema>;

export const testAiRouteTargetSchema = z.enum(AI_ROUTE_TEST_TARGETS);

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

export interface AiConnectionResponse {
  id: string;
  organizationId: string;
  name: string;
  provider: AiProvider;
  defaultModelId: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  isEnabled: boolean;
  lastStatus: AiConnectionStatus;
  lastError: string | null;
  lastTestedAt: string | null;
  lastUsedAt: string | null;
  consecutiveFailures: number;
  cooldownRemainingSec: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiPolicyResponse {
  id: string | null;
  organizationId: string;
  isEnabled: boolean;
  autoScoreApplications: boolean;
  defaultRouteMode: AiProxyMode;
  defaultRouteTargets: AiRouteTarget[];
  updatedAt: string | null;
}

export interface AiFeatureRouteResponse {
  feature: AiFeatureKey;
  isEnabled: boolean;
  mode: AiFeatureRouteMode;
  targets: AiRouteTarget[];
}

export interface OrganizationAiOverviewResponse {
  policy: AiPolicyResponse;
  connections: AiConnectionResponse[];
  routes: AiFeatureRouteResponse[];
}

export interface OrganizationAiFeatureStatus {
  enabled: boolean;
  mode: AiFeatureRouteMode;
  effectiveMode: AiProxyMode;
  activeTargetCount: number;
  primaryProvider?: AiProvider;
  primaryModelId?: string;
}

export interface OrganizationAiStatusResponse {
  configured: boolean;
  enabled: boolean;
  autoScoreApplications: boolean;
  provider?: AiProvider;
  modelId?: string;
  activeConnectionsCount?: number;
  features?: Record<AiFeatureKey, OrganizationAiFeatureStatus>;
}

export interface TestAiConnectionResponse {
  ok: boolean;
  latencyMs: number;
  model: string;
}

export interface TestAiRouteAttemptResult {
  connectionId: string;
  connectionName: string;
  provider: AiProvider;
  modelId: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
  skippedReason?: string;
}

export interface TestAiRouteResponse {
  feature: AiRouteTestTarget;
  mode: AiProxyMode;
  ok: boolean;
  totalLatencyMs: number;
  succeededConnectionId?: string;
  attempts: TestAiRouteAttemptResult[];
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

export const JOB_SCORING_CATEGORIES = [
  "Experience",
  "Technical",
  "Soft Skills",
  "Custom",
] as const;

export type JobScoringCategory = (typeof JOB_SCORING_CATEGORIES)[number];

export const jobScoringCriterionSchema = z.object({
  id: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(160),
  category: z.enum(JOB_SCORING_CATEGORIES),
  description: z.string().trim().min(1).max(600),
  weight: z.number().int().min(0).max(100),
  maxScore: z.number().int().min(1).max(100).default(10),
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/),
});

export type JobScoringCriterion = z.infer<typeof jobScoringCriterionSchema>;

export const jobScoringConfigSchema = z.object({
  criteria: z.array(jobScoringCriterionSchema).max(12).default([]),
  autoScore: z.boolean().default(false),
});

export type JobScoringConfig = z.infer<typeof jobScoringConfigSchema>;

export const DEFAULT_JOB_SCORING_CONFIG: JobScoringConfig = {
  criteria: [],
  autoScore: false,
};

export function normalizeJobScoringConfig(raw: unknown): JobScoringConfig {
  const parsed = jobScoringConfigSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return { ...DEFAULT_JOB_SCORING_CONFIG, criteria: [] };
}

export const generateScoringCriteriaSchema = z.object({
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
  count: z.number().int().min(3).max(8).default(5),
  existingTitles: z.array(z.string().trim().max(200)).max(20).default([]),
});

export type GenerateScoringCriteriaInput = z.infer<
  typeof generateScoringCriteriaSchema
>;

export interface GenerateScoringCriteriaResponse {
  criteria: JobScoringCriterion[];
  provider: AiProvider;
  modelId: string;
}

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

export const aiCriterionRawOutputSchema = z.object({
  key: z.string().trim().min(1).max(60),
  score: z.number().min(0).max(10),
  confidence: z.number().min(0).max(100),
  evidence: z.string().trim().min(1).max(1200),
  strengths: z.array(z.string().trim().min(1).max(400)).max(5).default([]),
  gaps: z.array(z.string().trim().min(1).max(400)).max(5).default([]),
});

export const aiScoreRawOutputSchema = z.object({
  criteria: z.array(aiCriterionRawOutputSchema).min(1).max(12),
  summary: z.string().trim().min(1).max(1500),
  suggestedQuestions: z
    .array(z.string().trim().min(1).max(400))
    .max(4)
    .default([]),
});

export interface AiCriterionEvaluation {
  key: string;
  title: string;
  category: JobScoringCategory;
  weight: number;
  normalizedWeight: number;
  score: number;
  maxScore: number;
  confidence: number;
  confidenceLevel: "high" | "medium" | "low";
  evidence: string;
  strengths: string[];
  gaps: string[];
}

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
  criteriaResults?: AiCriterionEvaluation[] | null;
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
