import { z } from "zod";
import { ApplicationStage } from "../applications";

export const createApplicationSchema = z
  .object({
    jobId: z.string().min(1, "Job ID is required"),
    candidateId: z.string().optional(),
    name: z.string().optional(),
    candidateName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    candidateEmail: z
      .string()
      .email("Invalid candidate email address")
      .optional(),
    phone: z.string().optional(),
    candidatePhone: z.string().optional(),
    stage: z.nativeEnum(ApplicationStage).optional(),
    notes: z.string().optional(),
    resumeUrl: z.string().optional(),
    resumeFileName: z.string().optional(),
    ref: z.string().optional(),
    referrer: z.string().optional(),
    sourceChannel: z.string().optional(),
    utmCampaign: z.string().optional(),
    trackingToken: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.candidateId) return true;
      const hasName = Boolean(data.candidateName || data.name);
      const hasEmail = Boolean(data.candidateEmail || data.email);
      return hasName && hasEmail;
    },
    {
      message:
        "Either candidateId or both candidateName (or name) and candidateEmail (or email) are required",
      path: ["candidateEmail"],
    },
  );

export type CreateApplicationSchema = z.infer<typeof createApplicationSchema>;
