export const INTERVIEW_TYPES = [
  "HR_SCREENING",
  "TECHNICAL",
  "CULTURE_FIT",
  "FINAL_ROUND",
  "ASSESSMENT",
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];
