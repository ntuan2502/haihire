import type {
  ApplicationFormFieldMode,
  Job,
  JobScoringCriterion,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "@/types";

export type StepId = 1 | 2 | 3 | 4;

export type {
  ApplicationFormFieldMode,
  ScreeningQuestion,
  ScreeningQuestionType,
};

export type ScoringCriterion = JobScoringCriterion;

export interface JobWizardEditorProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
}

export function parseSalaryRange(salaryRange?: string | null) {
  if (!salaryRange) {
    return { min: "", max: "", currency: null, per: null, negotiable: false };
  }
  if (salaryRange.toLowerCase().includes("negotiable")) {
    return { min: "", max: "", currency: null, per: null, negotiable: true };
  }
  const parts = salaryRange.split("-");
  const min = parts.length >= 2 ? parts[0].replace(/[^0-9]/g, "").trim() : "";
  const max = parts.length >= 2 ? parts[1].replace(/[^0-9]/g, "").trim() : "";

  let parsedCurrency: string | null = null;
  const upper = salaryRange.toUpperCase();
  if (upper.includes("VND") || upper.includes("₫")) parsedCurrency = "VND";
  else if (upper.includes("EUR") || upper.includes("€")) parsedCurrency = "EUR";
  else if (upper.includes("NOK")) parsedCurrency = "NOK";
  else if (upper.includes("GBP") || upper.includes("£")) parsedCurrency = "GBP";
  else if (upper.includes("SGD")) parsedCurrency = "SGD";
  else if (upper.includes("JPY") || upper.includes("¥") || upper.includes("￥"))
    parsedCurrency = "JPY";
  else if (upper.includes("USD") || upper.includes("$")) parsedCurrency = "USD";

  let parsedPer: string | null = null;
  const lower = salaryRange.toLowerCase();
  if (lower.includes("month") || lower.includes("tháng")) parsedPer = "Month";
  else if (lower.includes("hour") || lower.includes("giờ")) parsedPer = "Hour";
  else if (lower.includes("year") || lower.includes("năm")) parsedPer = "Year";

  return {
    min,
    max,
    currency: parsedCurrency,
    per: parsedPer,
    negotiable: false,
  };
}
