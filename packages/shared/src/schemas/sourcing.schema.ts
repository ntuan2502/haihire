import { z } from "zod";
import { SourcingChannel } from "../sourcing";

export const createTrackingLinkSchema = z.object({
  name: z.string().trim().min(1, "Tracking link name is required").max(200),
  source: z.nativeEnum(SourcingChannel),
  customSource: z.string().trim().max(200).optional(),
  jobId: z.string().uuid().optional(),
  campaign: z.string().trim().max(200).optional(),
  medium: z.string().trim().max(200).optional(),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  utmTerm: z.string().trim().max(200).optional(),
  utmContent: z.string().trim().max(200).optional(),
});

export const updateTrackingLinkSchema = createTrackingLinkSchema
  .partial()
  .extend({
    jobId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  });

export const recordClickSchema = z.object({
  token: z.string().trim().min(1, "Tracking token is required"),
  referrer: z.string().trim().max(2000).optional(),
});

export type CreateTrackingLinkSchema = z.infer<typeof createTrackingLinkSchema>;
export type UpdateTrackingLinkSchema = z.infer<typeof updateTrackingLinkSchema>;
export type RecordClickSchema = z.infer<typeof recordClickSchema>;
