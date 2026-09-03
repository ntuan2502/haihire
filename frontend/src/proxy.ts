import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("ats_token")?.value;
  const hasOrg = request.cookies.get("ats_has_org")?.value === "true";

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isOnboardingPage = pathname.startsWith("/onboarding");

  // 1. If user is ALREADY authenticated and tries to visit /login or /register
  // Server-side redirect immediately at HTTP layer (0ms flash, no HTML rendered)
  if (isAuthPage && token) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam && redirectParam.startsWith("/")) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
    if (!hasOrg) {
      return NextResponse.redirect(new URL("/onboarding/create-org", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. If user is NOT authenticated and tries to visit /dashboard or /onboarding
  if ((isDashboardPage || isOnboardingPage) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // 3. If user is authenticated but DOES NOT have an organization and tries to visit /dashboard
  if (isDashboardPage && token && !hasOrg) {
    return NextResponse.redirect(new URL("/onboarding/create-org", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/onboarding/:path*",
  ],
};
