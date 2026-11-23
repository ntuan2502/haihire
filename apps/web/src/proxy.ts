import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isWorkspaceRoute } from "@/lib/workspace-routes";

const AUTH_COOKIE_NAMES = [
  "haihire_token",
  "haihire_refresh_token",
  "haihire_has_org",
] as const;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface ProxySessionStatus {
  valid: boolean;
  hasOrg?: boolean;
}

function decodeBase64Url(segment: string): string {
  const padded = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  if (typeof atob === "function") {
    return atob(padded);
  }
  return Buffer.from(padded, "base64").toString("utf-8");
}

/**
 * Checks structural validity and `exp` timestamp on JWT tokens locally so expired
 * or corrupted cookies never trigger redirect loops. Opaque test strings without
 * dots pass through to backend verification when INTERNAL_API_URL is configured.
 */
function isExpiredOrMalformedJwt(rawToken: string): boolean {
  if (!rawToken.includes(".")) {
    return false;
  }
  const parts = rawToken.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return true;
  }
  try {
    const payloadJson = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function verifySessionWithBackend(
  request: NextRequest,
  token: string,
): Promise<ProxySessionStatus | null> {
  const internalApiUrl = env.INTERNAL_API_URL;
  if (!internalApiUrl) {
    return null;
  }
  const baseUrl = internalApiUrl.replace(/\/+$/, "");
  const cookieHeader =
    request.headers.get("cookie") || `haihire_token=${token}`;
  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (response.status === 401) {
      return { valid: false };
    }
    if (response.ok) {
      const user = (await response.json()) as {
        organizationId?: string | null;
      };
      return {
        valid: true,
        hasOrg: Boolean(user?.organizationId),
      };
    }
    return null;
  } catch {
    // Transient network/startup error: keep cookie fallback to avoid false logouts
    return null;
  }
}

function finalizeResponse(
  response: NextResponse,
  options: {
    clearAuth?: boolean;
    clearAccessTokenOnly?: boolean;
    syncHasOrg?: boolean;
  },
): NextResponse {
  if (options.clearAuth) {
    for (const name of AUTH_COOKIE_NAMES) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return response;
  }
  if (options.clearAccessTokenOnly) {
    response.cookies.set("haihire_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("haihire_has_org", "", { path: "/", maxAge: 0 });
  }
  if (
    typeof options.syncHasOrg === "boolean" &&
    !options.clearAccessTokenOnly
  ) {
    response.cookies.set(
      "haihire_has_org",
      options.syncHasOrg ? "true" : "false",
      {
        path: "/",
        maxAge: COOKIE_MAX_AGE_SECONDS,
        httpOnly: false,
        sameSite: "lax",
      },
    );
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawToken = request.cookies.get("haihire_token")?.value;
  let token =
    rawToken &&
    rawToken !== "null" &&
    rawToken !== "undefined" &&
    rawToken.trim().length > 0
      ? rawToken
      : undefined;
  const rawHasOrgCookie = request.cookies.get("haihire_has_org")?.value;
  let hasOrg = rawHasOrgCookie === "true";
  let shouldClearAccessTokenOnly = Boolean(rawToken && !token);
  let syncHasOrg: boolean | undefined;

  const isAuthPage =
    pathname === "/auth/login" || pathname === "/auth/register";
  const isWorkspacePage = isWorkspaceRoute(pathname);
  const isOnboardingPage = pathname.startsWith("/auth/onboarding");

  if (token && isExpiredOrMalformedJwt(token)) {
    token = undefined;
    hasOrg = false;
    shouldClearAccessTokenOnly = true;
  }

  if (token && (isAuthPage || isWorkspacePage || isOnboardingPage)) {
    const sessionStatus = await verifySessionWithBackend(request, token);
    if (sessionStatus) {
      if (!sessionStatus.valid) {
        token = undefined;
        hasOrg = false;
        shouldClearAccessTokenOnly = true;
      } else if (typeof sessionStatus.hasOrg === "boolean") {
        hasOrg = sessionStatus.hasOrg;
        if (rawHasOrgCookie !== (hasOrg ? "true" : "false")) {
          syncHasOrg = hasOrg;
        }
      }
    }
  }

  // 1. If user is ALREADY authenticated and tries to visit /auth/login or /auth/register
  // Server-side redirect immediately at HTTP layer (0ms flash, no HTML rendered)
  if (isAuthPage && token) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//") &&
      !redirectParam.startsWith("/\\")
    ) {
      return finalizeResponse(
        NextResponse.redirect(new URL(redirectParam, request.url)),
        { clearAccessTokenOnly: shouldClearAccessTokenOnly, syncHasOrg },
      );
    }
    if (!hasOrg) {
      return finalizeResponse(
        NextResponse.redirect(new URL("/auth/onboarding", request.url)),
        { clearAccessTokenOnly: shouldClearAccessTokenOnly, syncHasOrg },
      );
    }
    return finalizeResponse(
      NextResponse.redirect(new URL("/dashboard", request.url)),
      { clearAccessTokenOnly: shouldClearAccessTokenOnly, syncHasOrg },
    );
  }

  // 2. If user is NOT authenticated and tries to visit a workspace route or /auth/onboarding
  if ((isWorkspacePage || isOnboardingPage) && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    const targetRedirect = `${pathname}${search}`;
    // Only set safe redirect path
    if (
      targetRedirect.startsWith("/") &&
      !targetRedirect.startsWith("//") &&
      !targetRedirect.startsWith("/\\")
    ) {
      loginUrl.searchParams.set("redirect", targetRedirect);
    }
    return finalizeResponse(NextResponse.redirect(loginUrl), {
      clearAccessTokenOnly: shouldClearAccessTokenOnly,
      syncHasOrg,
    });
  }

  // 3. If user is authenticated but DOES NOT have an organization and tries to visit a workspace route
  if (isWorkspacePage && token && !hasOrg) {
    return finalizeResponse(
      NextResponse.redirect(new URL("/auth/onboarding", request.url)),
      { clearAccessTokenOnly: shouldClearAccessTokenOnly, syncHasOrg },
    );
  }

  return finalizeResponse(NextResponse.next(), {
    clearAccessTokenOnly: shouldClearAccessTokenOnly,
    syncHasOrg,
  });
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/dashboard/:path*",
    "/jobs/:path*",
    "/candidates/:path*",
    "/applications/:path*",
    "/interviews/:path*",
    "/source-tracking/:path*",
    "/settings/:path*",
    "/account/:path*",
    "/notifications/:path*",
  ],
};
