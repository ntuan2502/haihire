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
}

export const AI_PROVIDER_PRESETS: Record<AiProvider, AiProviderPreset> = {
  OPENAI: {
    id: "OPENAI",
    label: "OpenAI",
    defaultModelId: "gpt-4o-mini",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    modelsUrl: "https://platform.openai.com/docs/models",
    requiresApiKey: true,
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", badge: "recommended" },
      { id: "gpt-4o", label: "GPT-4o", badge: "powerful" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini", badge: "fast" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 nano", badge: "low_cost" },
    ],
  },
  ANTHROPIC: {
    id: "ANTHROPIC",
    label: "Anthropic",
    defaultModelId: "claude-3-5-haiku-latest",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    modelsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    requiresApiKey: true,
    models: [
      {
        id: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku",
        badge: "recommended",
      },
      {
        id: "claude-3-7-sonnet-latest",
        label: "Claude 3.7 Sonnet",
        badge: "powerful",
      },
      {
        id: "claude-3-5-sonnet-latest",
        label: "Claude 3.5 Sonnet",
        badge: "fast",
      },
    ],
  },
  GEMINI: {
    id: "GEMINI",
    label: "Google AI (Gemini)",
    defaultModelId: "gemini-2.5-flash",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    modelsUrl: "https://ai.google.dev/gemini-api/docs/models",
    requiresApiKey: true,
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        badge: "recommended",
      },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", badge: "powerful" },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        badge: "low_cost",
      },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "fast" },
    ],
  },
  OPENROUTER: {
    id: "OPENROUTER",
    label: "OpenRouter",
    defaultModelId: "google/gemini-2.5-flash",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    apiKeyUrl: "https://openrouter.ai/keys",
    modelsUrl: "https://openrouter.ai/models",
    requiresApiKey: true,
    models: [
      {
        id: "google/gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        badge: "recommended",
      },
      {
        id: "openai/gpt-4o-mini",
        label: "GPT-4o mini",
        badge: "fast",
      },
      {
        id: "anthropic/claude-3.5-sonnet",
        label: "Claude 3.5 Sonnet",
        badge: "powerful",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B",
        badge: "low_cost",
      },
    ],
  },
  OPENAI_COMPATIBLE: {
    id: "OPENAI_COMPATIBLE",
    label: "OpenAI-Compatible",
    defaultModelId: "llama3.1",
    defaultBaseUrl: "http://localhost:11434/v1",
    apiKeyUrl: "https://ollama.com/library",
    requiresApiKey: false,
    models: [
      { id: "llama3.1", label: "Llama 3.1 (Ollama)", badge: "recommended" },
      { id: "qwen2.5", label: "Qwen 2.5", badge: "fast" },
      { id: "deepseek-chat", label: "DeepSeek Chat", badge: "low_cost" },
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
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAiStatusResponse {
  configured: boolean;
  enabled: boolean;
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

export { screeningQuestionSchema };
