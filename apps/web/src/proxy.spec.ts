import { describe, it, expect, vi, afterEach } from "vitest";
import { proxy } from "./proxy";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";

function makeJwtWithExp(expSeconds: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", exp: expSeconds }),
  ).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("Next.js 16 Edge Proxy (apps/web/src/proxy.ts)", () => {
  afterEach(() => {
    env.INTERNAL_API_URL = "";
    vi.restoreAllMocks();
  });

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

  it("Requirement 4a & 4c: redirects unauthenticated request to /dashboard with HTTP 307 to /auth/login", async () => {
    // Arrange: user has no token cookie
    const req = createMockRequest("/dashboard");

    // Act
    const res = await proxy(req);

    // Assert: server-side HTTP redirect (307) to /auth/login with redirect param
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBe(
      "http://localhost:3000/auth/login?redirect=%2Fdashboard",
    );
  });

  it("Requirement 4b: allows authenticated user with organization to access /dashboard directly (NextResponse.next())", async () => {
    // Arrange: user has valid haihire_token and haihire_has_org="true"
    const req = createMockRequest("/dashboard", {
      haihire_token: "jwt-token-xyz-12345",
      haihire_has_org: "true",
    });

    // Act
    const res = await proxy(req);

    // Assert: passes through via NextResponse.next() without redirect
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user away from /auth/login directly to /dashboard (HTTP 307)", async () => {
    // Arrange: already logged in
    const req = createMockRequest("/auth/login", {
      haihire_token: "jwt-token-xyz-12345",
      haihire_has_org: "true",
    });

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirects authenticated user without organization away from /dashboard to /auth/onboarding (HTTP 307)", async () => {
    // Arrange: logged in but no org
    const req = createMockRequest("/dashboard", {
      haihire_token: "jwt-token-xyz-12345",
      haihire_has_org: "false",
    });

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth/onboarding",
    );
  });

  it("allows safe internal redirect parameter for authenticated user", async () => {
    const req = createMockRequest(
      "/auth/login",
      {
        haihire_token: "jwt-token-xyz-12345",
        haihire_has_org: "true",
      },
      "redirect=/dashboard/jobs",
    );

    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/dashboard/jobs",
    );
  });

  it("prevents open redirect attacks via protocol-relative URLs", async () => {
    const req = createMockRequest(
      "/auth/login",
      {
        haihire_token: "jwt-token-xyz-12345",
        haihire_has_org: "true",
      },
      "redirect=//evil.com/phish",
    );

    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("prevents open redirect attacks via backslash prefix", async () => {
    const req = createMockRequest(
      "/auth/login",
      {
        haihire_token: "jwt-token-xyz-12345",
        haihire_has_org: "true",
      },
      "redirect=/\\evil.com",
    );

    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("treats 'null' or 'undefined' string cookies as unauthenticated and redirects to /auth/login", async () => {
    const reqNull = createMockRequest("/dashboard", { haihire_token: "null" });
    const resNull = await proxy(reqNull);
    expect(resNull.status).toBe(307);
    expect(resNull.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?redirect=%2Fdashboard",
    );

    const reqUndef = createMockRequest("/dashboard", {
      haihire_token: "undefined",
    });
    const resUndef = await proxy(reqUndef);
    expect(resUndef.status).toBe(307);
    expect(resUndef.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?redirect=%2Fdashboard",
    );
  });

  it("clears expired JWT cookies on /auth/login instead of redirecting to /auth/onboarding", async () => {
    const expiredJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) - 60);
    const req = createMockRequest("/auth/login", {
      haihire_token: expiredJwt,
      haihire_refresh_token: "stale-refresh",
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("haihire_token")?.value).toBe("");
    expect(res.cookies.get("haihire_refresh_token")?.value).toBe("");
    expect(res.cookies.get("haihire_has_org")?.value).toBe("");
  });

  it("redirects expired JWT on /auth/onboarding to /auth/login and clears cookies", async () => {
    const expiredJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) - 60);
    const req = createMockRequest("/auth/onboarding", {
      haihire_token: expiredJwt,
    });

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?redirect=%2Fauth%2Fonboarding",
    );
    expect(res.cookies.get("haihire_token")?.value).toBe("");
  });

  it("clears stale HttpOnly token when backend /auth/me returns 401 on /auth/login, preventing onboarding bounce loop", async () => {
    env.INTERNAL_API_URL = "http://api.test.local/api";
    const validJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    const req = createMockRequest("/auth/login", {
      haihire_token: validJwt,
      haihire_refresh_token: "revoked-refresh",
    });

    const res = await proxy(req);

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test.local/api/auth/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("haihire_token")?.value).toBe("");
    expect(res.cookies.get("haihire_refresh_token")?.value).toBe("");
    expect(res.cookies.get("haihire_has_org")?.value).toBe("");
  });

  it("breaks /auth/onboarding hang when backend /auth/me rejects stale cookie with 401", async () => {
    env.INTERNAL_API_URL = "http://api.test.local/api";
    const validJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 401 }),
    );

    const req = createMockRequest("/auth/onboarding", {
      haihire_token: validJwt,
    });

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?redirect=%2Fauth%2Fonboarding",
    );
    expect(res.cookies.get("haihire_token")?.value).toBe("");
    expect(res.cookies.get("haihire_has_org")?.value).toBe("");
  });

  it("syncs haihire_has_org=true from backend /auth/me to route user to /dashboard instead of /auth/onboarding when org cookie is missing", async () => {
    env.INTERNAL_API_URL = "http://api.test.local/api";
    const validJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "u-1", organizationId: "org-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const req = createMockRequest("/auth/login", {
      haihire_token: validJwt,
    });

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(res.cookies.get("haihire_has_org")?.value).toBe("true");
  });
});
