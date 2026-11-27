import { z } from "zod";

export const APPLICATION_FORM_FIELD_MODES = [
  "hidden",
  "optional",
  "required",
] as const;

export type ApplicationFormFieldMode =
  (typeof APPLICATION_FORM_FIELD_MODES)[number];

export const SCREENING_QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "number",
  "date",
  "url",
  "yes_no",
  "file_upload",
] as const;

export type ScreeningQuestionType = (typeof SCREENING_QUESTION_TYPES)[number];

export const COVER_LETTER_MAX_LENGTH = 10000;
export const MAX_SCREENING_QUESTIONS = 30;
export const SCREENING_ANSWER_TEXT_MAX_LENGTH = 4000;

export const screeningFileAnswerSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  size: z.number().nonnegative(),
});

export type ScreeningFileAnswer = z.infer<typeof screeningFileAnswerSchema>;

export function isScreeningFileAnswer(
  val: unknown,
): val is ScreeningFileAnswer {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.url === "string" &&
    obj.url.trim().length > 0 &&
    typeof obj.fileName === "string" &&
    obj.fileName.trim().length > 0 &&
    typeof obj.mimeType === "string" &&
    typeof obj.size === "number" &&
    Number.isFinite(obj.size)
  );
}

export function isValidDateOnlyString(val: string): boolean {
  const trimmed = val.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const [yStr, mStr, dStr] = trimmed.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isValidHttpUrl(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const screeningQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    text: z
      .string()
      .trim()
      .min(1, "Question text is required")
      .max(500, "Question text must be 500 characters or fewer"),
    type: z.enum(SCREENING_QUESTION_TYPES),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "single_choice" || val.type === "multiple_choice") {
      const uniqueOptions = new Set(
        (val.options ?? []).map((opt) => opt.trim()).filter(Boolean),
      );
      if (uniqueOptions.size < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Choice questions require at least 2 distinct options",
        });
      }
    }
  });

export type ScreeningQuestion = z.infer<typeof screeningQuestionSchema>;

export const jobApplicationFormConfigSchema = z.object({
  phone: z.enum(APPLICATION_FORM_FIELD_MODES),
  resume: z.enum(APPLICATION_FORM_FIELD_MODES),
  coverLetter: z.enum(APPLICATION_FORM_FIELD_MODES),
  screeningQuestions: z
    .array(screeningQuestionSchema)
    .max(MAX_SCREENING_QUESTIONS),
});

export type JobApplicationFormConfig = z.infer<
  typeof jobApplicationFormConfigSchema
>;

export const DEFAULT_JOB_APPLICATION_FORM_CONFIG: JobApplicationFormConfig = {
  phone: "optional",
  resume: "required",
  coverLetter: "hidden",
  screeningQuestions: [],
};

export type ScreeningAnswerValue =
  string | number | boolean | string[] | ScreeningFileAnswer | null;

export const screeningAnswerSubmissionSchema = z.object({
  questionId: z.string().trim().min(1).max(100),
  answer: z
    .union([
      z.string().max(SCREENING_ANSWER_TEXT_MAX_LENGTH),
      z.number().finite(),
      z.boolean(),
      z.array(z.string().max(200)).max(20),
      z.null(),
    ])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});

export type ScreeningAnswerSubmission = z.infer<
  typeof screeningAnswerSubmissionSchema
>;

export interface ScreeningAnswerItem {
  questionId: string;
  questionText: string;
  questionType: ScreeningQuestionType;
  answer: ScreeningAnswerValue;
}

function normalizeFieldMode(
  value: unknown,
  fallback: ApplicationFormFieldMode,
): ApplicationFormFieldMode {
  if (value === "hidden" || value === "optional" || value === "required") {
    return value;
  }
  if (value === "off") {
    return "hidden";
  }
  return fallback;
}

function normalizeQuestionType(value: unknown): ScreeningQuestionType {
  if (
    value === "short_text" ||
    value === "long_text" ||
    value === "single_choice" ||
    value === "multiple_choice" ||
    value === "number" ||
    value === "date" ||
    value === "url" ||
    value === "yes_no" ||
    value === "file_upload"
  ) {
    return value;
  }
  if (value === "text") {
    return "short_text";
  }
  return "short_text";
}

export function normalizeJobApplicationFormConfig(
  raw: unknown,
): JobApplicationFormConfig {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      obj = null;
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  }

  if (!obj) {
    return {
      ...DEFAULT_JOB_APPLICATION_FORM_CONFIG,
      screeningQuestions: [],
    };
  }

  const rawQuestions = Array.isArray(obj.screeningQuestions)
    ? obj.screeningQuestions
    : [];

  const screeningQuestions: ScreeningQuestion[] = [];
  for (const item of rawQuestions) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!id || !text) continue;

    const type = normalizeQuestionType(record.type);
    const required = Boolean(record.required);
    const cleanedOptions = Array.isArray(record.options)
      ? Array.from(
          new Set(
            record.options
              .filter((o): o is string => typeof o === "string")
              .map((o) => o.trim())
              .filter(Boolean),
          ),
        ).slice(0, 20)
      : undefined;

    if (type === "single_choice" || type === "multiple_choice") {
      if (!cleanedOptions || cleanedOptions.length < 2) {
        continue;
      }
      screeningQuestions.push({
        id,
        text: text.slice(0, 500),
        type,
        required,
        options: cleanedOptions,
      });
    } else {
      screeningQuestions.push({
        id,
        text: text.slice(0, 500),
        type,
        required,
      });
    }

    if (screeningQuestions.length >= MAX_SCREENING_QUESTIONS) {
      break;
    }
  }

  return {
    phone: normalizeFieldMode(
      obj.phone,
      DEFAULT_JOB_APPLICATION_FORM_CONFIG.phone,
    ),
    resume: normalizeFieldMode(
      obj.resume,
      DEFAULT_JOB_APPLICATION_FORM_CONFIG.resume,
    ),
    coverLetter: normalizeFieldMode(
      obj.coverLetter,
      DEFAULT_JOB_APPLICATION_FORM_CONFIG.coverLetter,
    ),
    screeningQuestions,
  };
}
