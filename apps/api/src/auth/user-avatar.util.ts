import { createHash } from "node:crypto";

/**
 * Computes a privacy-safe Gravatar URL using SHA-256 of the trimmed lowercase email.
 * Uses `d=404` so clients can fall back to initials when no Gravatar exists.
 */
export function buildGravatarUrl(email: string, size = 256): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

/**
 * Builds the authenticated proxy URL for an uploaded user avatar with optional cache-busting timestamp.
 */
export function buildUploadedUserAvatarUrl(
  userId: string,
  updatedAt?: Date | string | null,
): string {
  const version = updatedAt ? new Date(updatedAt).getTime() : 0;
  const query = Number.isFinite(version) && version > 0 ? `?v=${version}` : "";
  return `/auth/avatars/${encodeURIComponent(userId)}${query}`;
}
