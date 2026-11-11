import type { Response } from "express";
import { env } from "../config/env";

const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Sets the readable organization-membership indicator cookie consumed by the
 * Next.js Edge proxy for routing between onboarding and dashboard.
 */
export function setHasOrgCookie(
  res: Response | undefined,
  hasOrg: boolean,
): void {
  if (!res?.cookie) return;
  res.cookie("haihire_has_org", hasOrg ? "true" : "false", {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

/**
 * Issues authentication cookies (`haihire_token`, optional `haihire_refresh_token`,
 * and optional `haihire_has_org` flag).
 */
export function setAuthCookies(
  res: Response | undefined,
  accessToken: string,
  refreshToken?: string,
  hasOrg?: boolean,
): void {
  if (!res?.cookie) return;
  const secure = env.NODE_ENV === "production";
  res.cookie("haihire_token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: "/",
  });
  if (refreshToken) {
    res.cookie("haihire_refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
      path: "/",
    });
  }
  if (typeof hasOrg === "boolean") {
    setHasOrgCookie(res, hasOrg);
  }
}

/**
 * Clears all authentication and organization indicator cookies (HttpOnly + readable)
 * to recover cleanly from logout or expired/revoked sessions.
 */
export function clearAuthCookies(res: Response | undefined): void {
  if (!res?.cookie) return;
  const baseOptions = {
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
  res.cookie("haihire_token", "", { ...baseOptions, httpOnly: true });
  res.cookie("haihire_refresh_token", "", { ...baseOptions, httpOnly: true });
  res.cookie("haihire_has_org", "", { ...baseOptions, httpOnly: false });
}
