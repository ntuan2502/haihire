import { describe, it, expect } from "vitest";
import { middleware } from "./middleware";
import { NextRequest } from "next/server";

describe("Edge Middleware (frontend/src/middleware.ts)", () => {
  const createMockRequest = (
    pathname: string,
    cookies: Record<string, string> = {},
    search = "",
  ) => {
    const url = `http://localhost:3000${pathname}${search ? `?${search}` : ""}`;
    const req = new NextRequest(new URL(url));
    for (const [key, value] of Object.entries(cookies)) {
      req.cookies.set(key, value);
    }
    return req;
  };

  it("Requirement 4a & 4c: redirects unauthenticated request to /dashboard with HTTP 307 to /auth/login", () => {
    // Arrange: user has no token cookie
    const req = createMockRequest("/dashboard");

    // Act
    const res = middleware(req);

    // Assert: server-side HTTP redirect (307) to /auth/login with redirect param
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe(
      "http://localhost:3000/auth/login?redirect=%2Fdashboard",
    );
  });

  it("Requirement 4b: allows authenticated user with organization to access /dashboard directly (NextResponse.next())", () => {
    // Arrange: user has valid haihire_token and haihire_has_org="true"
    const req = createMockRequest("/dashboard", {
      haihire_token: "jwt-token-xyz-12345",
      haihire_has_org: "true",
    });

    // Act
    const res = middleware(req);

    // Assert: passes through via NextResponse.next() without redirect
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user away from /auth/login directly to /dashboard (HTTP 307)", () => {
    // Arrange: already logged in
    const req = createMockRequest("/auth/login", {
      haihire_token: "jwt-token-xyz-12345",
      haihire_has_org: "true",
    });

    // Act
    const res = middleware(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirects authenticated user without organization away from /dashboard to /auth/onboarding (HTTP 307)", () => {
    // Arrange: logged in but no org
    const req = createMockRequest("/dashboard", {
      haihire_token: "jwt-token-xyz-12345",
      haihire_has_org: "false",
    });

    // Act
    const res = middleware(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth/onboarding",
    );
  });
});
