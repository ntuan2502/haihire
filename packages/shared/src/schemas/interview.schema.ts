import { z } from "zod";
import { INTERVIEW_FORMATS, INTERVIEW_TYPES } from "../interviews";

export const interviewScorecardSchema = z.object({
  overallRating: z.number().min(1).max(5),
  recommendation: z.enum(["STRONG_YES", "YES", "NEUTRAL", "NO", "STRONG_NO"]),
  technicalScore: z.number().min(1).max(5).optional(),
  communicationScore: z.number().min(1).max(5).optional(),
  cultureScore: z.number().min(1).max(5).optional(),
  problemSolvingScore: z.number().min(1).max(5).optional(),
  feedback: z.string().max(4000).optional(),
  evaluatedBy: z.string().optional(),
  evaluatedAt: z.string().optional(),
});

const interviewScheduleSchema = z.object({
  applicationId: z.string().trim().min(1, "Application ID is required"),
  scheduledAt: z.string().datetime({ offset: true }),
  type: z.enum(INTERVIEW_TYPES),
  format: z.enum(INTERVIEW_FORMATS).optional(),
  linkOrLocation: z.string().trim().max(500).optional(),
  interviewer: z.string().trim().min(1, "Interviewer is required").optional(),
  interviewerId: z.string().trim().min(1).optional(),
  round: z.number().int().min(1).max(20).optional(),
  scorecard: z.union([interviewScorecardSchema, z.string()]).optional(),
  notes: z.string().max(4000).optional(),
  sendInvitationEmail: z.boolean().optional(),
  templateId: z.string().optional(),
});

export const createInterviewSchema = interviewScheduleSchema.refine(
  (value) => Boolean(value.interviewerId || value.interviewer),
  { message: "Interviewer is required", path: ["interviewerId"] },
);

export const updateInterviewSchema = interviewScheduleSchema
  .omit({ applicationId: true, sendInvitationEmail: true, templateId: true })
  .partial();

const scorecardJsonStringSchema = z
  .string()
  .min(1, "Scorecard is required")
  .superRefine((raw, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Scorecard must be a valid JSON object",
      });
      return;
    }
    const result = interviewScorecardSchema.safeParse(parsed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path,
        });
      }
    }
  });

export const submitScorecardSchema = z.object({
  scorecard: z.union([interviewScorecardSchema, scorecardJsonStringSchema]),
});

export type CreateInterviewSchema = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewSchema = z.infer<typeof updateInterviewSchema>;
export type SubmitScorecardSchema = z.infer<typeof submitScorecardSchema>;
