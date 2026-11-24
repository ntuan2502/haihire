import { z } from "zod";

export const updateUserProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
});

export type UpdateUserProfileSchema = z.infer<typeof updateUserProfileSchema>;

export const registerSchema = updateUserProfileSchema.extend({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type RegisterSchema = z.infer<typeof registerSchema>;

export const USER_AVATAR_SOURCES = ["NONE", "UPLOAD", "GRAVATAR"] as const;
export type UserAvatarSource = (typeof USER_AVATAR_SOURCES)[number];

export const MAX_USER_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_USER_AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ALLOWED_USER_AVATAR_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const updateUserAvatarSourceSchema = z.object({
  source: z.enum(["NONE", "GRAVATAR"]),
});

export type UpdateUserAvatarSourceSchema = z.infer<
  typeof updateUserAvatarSourceSchema
>;
