import { z } from "zod";

export const notificationPreferencesSchema = z.strictObject({
  applicationWebsite: z.boolean(),
  interviewWebsite: z.boolean(),
  applicationEmail: z.boolean(),
  interviewEmail: z.boolean(),
});

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  applicationWebsite: true,
  interviewWebsite: true,
  applicationEmail: false,
  interviewEmail: false,
};
