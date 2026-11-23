import { z } from "zod";
import {
  isValidIanaTimezone,
  SUPPORTED_CURRENCIES,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_NAME_DISPLAY_ORDERS,
  SUPPORTED_ORG_LANGUAGES,
  SUPPORTED_TIME_FORMATS,
} from "../organizations";
import { ROLE_LIST } from "../permissions";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens",
  );

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(200),
  slug: slugSchema,
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(200)
    .optional(),
  slug: slugSchema.optional(),
  defaultLanguage: z.enum(SUPPORTED_ORG_LANGUAGES).optional(),
  timezone: z
    .string()
    .refine((tz) => isValidIanaTimezone(tz), {
      message:
        "Timezone must be a valid IANA timezone identifier (e.g. Asia/Ho_Chi_Minh)",
    })
    .optional(),
  dateFormat: z.enum(SUPPORTED_DATE_FORMATS).optional(),
  timeFormat: z.enum(SUPPORTED_TIME_FORMATS).optional(),
  nameDisplayOrder: z.enum(SUPPORTED_NAME_DISPLAY_ORDERS).optional(),
  defaultCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ROLE_LIST),
});

export const createInviteLinkSchema = z.object({
  role: z.enum(ROLE_LIST).optional(),
  expiresIn: z.string().trim().optional(),
  maxUses: z.string().trim().optional(),
});

export type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>;
export type UpdateMemberRoleSchema = z.infer<typeof updateMemberRoleSchema>;
export type CreateInviteLinkSchema = z.infer<typeof createInviteLinkSchema>;
