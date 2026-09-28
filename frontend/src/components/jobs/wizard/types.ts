import type { Job } from "@/types";

export type StepId = 1 | 2 | 3 | 4;

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: "text" | "yes_no";
  required: boolean;
}

export interface ScoringCriterion {
  id: string;
  title: string;
  category: "Experience" | "Technical" | "Soft Skills" | "Custom";
  description: string;
  weight: number;
  maxScore: number;
  key: string;
}

export interface JobWizardEditorProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
}

export const DEFAULT_CRITERIA: ScoringCriterion[] = [
  {
    id: "crit_1",
    title: "Software Documentation Experience",
    category: "Experience",
    description:
      "Minimum of 2 years experience creating technical documentation for software products, including setup guides and troubleshooting playbooks.",
    weight: 90,
    maxScore: 10,
    key: "technical_writing_experience",
  },
  {
    id: "crit_2",
    title: "Developer Facing Content Proficiency",
    category: "Technical",
    description:
      "Demonstrated ability to document APIs, migrations, and operations-focused content for a technical audience.",
    weight: 80,
    maxScore: 10,
    key: "api_and_dev_content",
  },
  {
    id: "crit_3",
    title: "Markdown and Docs-as-Code Workflow",
    category: "Technical",
    description:
      "Proficiency in using Markdown and version control systems (e.g., Git) within a docs-as-code documentation lifecycle.",
    weight: 70,
    maxScore: 10,
    key: "docs_as_code_workflow",
  },
  {
    id: "crit_4",
    title: "Clarity and Information Architecture",
    category: "Soft Skills",
    description:
      "Evidence of translating complex technical systems into simple, actionable language for both admins and end-users.",
    weight: 60,
    maxScore: 10,
    key: "complex_system_simplification",
  },
  {
    id: "crit_5",
    title: "Recruiting Software Familiarity",
    category: "Custom",
    description:
      "Prior experience or familiarity with hiring/recruiting software terminology and workflows.",
    weight: 30,
    maxScore: 10,
    key: "domain_knowledge_recruiting",
  },
  {
    id: "crit_6",
    title: "Open-Source Documentation",
    category: "Custom",
    description:
      "History of contributing to open-source documentation projects or public-facing community docs.",
    weight: 20,
    maxScore: 10,
    key: "open_source_contributions",
  },
];

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
  else if (upper.includes("USD") || upper.includes("$")) parsedCurrency = "USD";

  let parsedPer: string | null = null;
  const lower = salaryRange.toLowerCase();
  if (lower.includes("month") || lower.includes("tháng")) parsedPer = "Month";
  else if (lower.includes("hour") || lower.includes("giờ")) parsedPer = "Hour";
  else if (lower.includes("year") || lower.includes("năm")) parsedPer = "Year";

  return { min, max, currency: parsedCurrency, per: parsedPer, negotiable: false };
}
