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
