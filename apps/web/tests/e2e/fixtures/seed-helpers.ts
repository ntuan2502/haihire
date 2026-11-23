import { randomUUID } from "node:crypto";
import type { APIRequestContext, Cookie } from "@playwright/test";

/**
 * Deterministic Demo 1 IDs matching apps/api/src/prisma/seed.ts
 */
export const SEED_ALPHA_ORG_ID = "00000000-0000-4000-8000-000000000010";
export const SEED_DEMO_1_JOB_ID = "00000000-0000-4000-8000-000000000101";
export const SEED_DEMO_2_ORG_ID = "00000000-0000-4000-8000-000000000020";

export async function getOrgAlphaId(): Promise<string> {
  return SEED_ALPHA_ORG_ID;
}

export interface ParsedAuthCookies {
  cookieHeader: string;
  accessToken: string;
  refreshToken?: string;
  hasOrg?: boolean;
}

export interface IsolatedTenantSession extends ParsedAuthCookies {
  userId: string;
  email: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  cookies: Cookie[];
}

export function extractAuthCookies(
  headersArray: Array<{ name: string; value: string }>,
  fallbackAccessToken = "",
): ParsedAuthCookies {
  let accessToken = fallbackAccessToken;
  let refreshToken: string | undefined;
  let hasOrg: boolean | undefined;

  for (const h of headersArray) {
    if (h.name.toLowerCase() !== "set-cookie") continue;
    const tokenMatch = h.value.match(/haihire_token=([^;]+)/);
    if (tokenMatch) accessToken = tokenMatch[1];
    const refreshMatch = h.value.match(/haihire_refresh_token=([^;]+)/);
    if (refreshMatch) refreshToken = refreshMatch[1];
    const hasOrgMatch = h.value.match(/haihire_has_org=([^;]+)/);
    if (hasOrgMatch) hasOrg = hasOrgMatch[1] === "true";
  }

  const parts = [`haihire_token=${accessToken}`];
  if (refreshToken) parts.push(`haihire_refresh_token=${refreshToken}`);
  if (hasOrg !== undefined) parts.push(`haihire_has_org=${String(hasOrg)}`);

  return {
    cookieHeader: parts.join("; "),
    accessToken,
    refreshToken,
    hasOrg,
  };
}

export function toPlaywrightCookies(
  parsed: ParsedAuthCookies,
  baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:13000",
  forceHasOrg = true,
): Cookie[] {
  const { hostname } = new URL(baseURL);
  const cookies: Cookie[] = [
    {
      name: "haihire_token",
      value: parsed.accessToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: -1,
      secure: false,
    },
  ];
  if (parsed.refreshToken) {
    cookies.push({
      name: "haihire_refresh_token",
      value: parsed.refreshToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: -1,
      secure: false,
    });
  }
  const hasOrgVal = parsed.hasOrg !== undefined ? parsed.hasOrg : forceHasOrg;
  cookies.push({
    name: "haihire_has_org",
    value: hasOrgVal ? "true" : "false",
    domain: hostname,
    path: "/",
    httpOnly: false,
    sameSite: "Lax",
    expires: -1,
    secure: false,
  });
  return cookies;
}

/**
 * Authenticates user through /api/auth/login, switches to `expectedOrgId` if
 * provided and different, and captures Playwright cookies + header string.
 */
export async function loginWithCookies(
  request: APIRequestContext,
  email = "admin@tun.io.vn",
  password = process.env.DEMO_SEED_PASSWORD ||
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
    "dev-seed-password-2026",
  expectedOrgId?: string,
  baseURL?: string,
): Promise<{
  cookieHeader: string;
  parsed: ParsedAuthCookies;
  cookies: Cookie[];
}> {
  const loginRes = await request.post("/api/auth/login", {
    data: { email, password },
  });

  if (!loginRes.ok()) {
    throw new Error(
      `Login failed for ${email} with status ${loginRes.status()}: ${await loginRes.text()}`,
    );
  }

  const loginBody = (await loginRes.json()) as {
    accessToken?: string;
    user?: { organizationId?: string | null };
  };
  let parsed = extractAuthCookies(
    loginRes.headersArray(),
    loginBody.accessToken || "",
  );

  if (!parsed.accessToken) {
    throw new Error(
      `Could not extract haihire_token for ${email}. Status: ${loginRes.status()}`,
    );
  }

  if (expectedOrgId && loginBody.user?.organizationId !== expectedOrgId) {
    const switchRes = await request.post("/api/organizations/switch", {
      headers: {
        Cookie: parsed.cookieHeader,
        Authorization: `Bearer ${parsed.accessToken}`,
      },
      data: { organizationId: expectedOrgId },
    });
    if (!switchRes.ok()) {
      throw new Error(
        `Failed to switch ${email} to org ${expectedOrgId}: ${switchRes.status()} ${await switchRes.text()}`,
      );
    }
    const switchParsed = extractAuthCookies(
      switchRes.headersArray(),
      parsed.accessToken,
    );
    parsed = {
      ...parsed,
      ...switchParsed,
      accessToken: switchParsed.accessToken || parsed.accessToken,
      refreshToken: switchParsed.refreshToken || parsed.refreshToken,
      hasOrg: true,
    };
  }

  return {
    cookieHeader: parsed.cookieHeader,
    parsed,
    cookies: toPlaywrightCookies(parsed, baseURL, true),
  };
}

export async function loginAsAdmin(
  request: APIRequestContext,
  email = "admin@tun.io.vn",
  password = process.env.DEMO_SEED_PASSWORD ||
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
    "dev-seed-password-2026",
  expectedOrgId?: string,
): Promise<string> {
  const { cookieHeader } = await loginWithCookies(
    request,
    email,
    password,
    expectedOrgId,
  );
  return cookieHeader;
}

/**
 * Registers a brand-new user and creates an isolated organization so E2E
 * multi-tenant and org-switch tests never collide with Demo 1..4 shared state.
 */
export async function createIsolatedTenant(
  request: APIRequestContext,
  prefix = "e2e-tenant",
  baseURL?: string,
): Promise<IsolatedTenantSession> {
  const unique = randomUUID().slice(0, 8);
  const email = `${prefix}-${unique}@example.com`;
  const password = "E2EIsolatedPassword2026!";

  const regRes = await request.post("/api/auth/register", {
    data: {
      firstName: "Isolated",
      lastName: "Admin",
      email,
      password,
    },
  });
  if (!regRes.ok()) {
    throw new Error(
      `Failed to register isolated user ${email}: ${regRes.status()} ${await regRes.text()}`,
    );
  }
  const regBody = (await regRes.json()) as {
    accessToken: string;
    user: { id: string };
  };
  let parsed = extractAuthCookies(regRes.headersArray(), regBody.accessToken);

  const slug = `${prefix}-${unique}`;
  const orgName = `E2E ${prefix} ${unique}`;
  const orgRes = await request.post("/api/organizations", {
    headers: {
      Cookie: parsed.cookieHeader,
      Authorization: `Bearer ${parsed.accessToken}`,
    },
    data: { name: orgName, slug },
  });
  if (!orgRes.ok()) {
    throw new Error(
      `Failed to create isolated org ${slug}: ${orgRes.status()} ${await orgRes.text()}`,
    );
  }
  const orgBody = (await orgRes.json()) as {
    organization?: { id: string; name: string; slug: string };
    id?: string;
  };
  const orgId = orgBody.organization?.id || orgBody.id || "";
  const orgHeaders = extractAuthCookies(
    orgRes.headersArray(),
    parsed.accessToken,
  );
  parsed = {
    accessToken: orgHeaders.accessToken || parsed.accessToken,
    refreshToken: orgHeaders.refreshToken || parsed.refreshToken,
    hasOrg: true,
    cookieHeader: "",
  };
  const parts = [`haihire_token=${parsed.accessToken}`];
  if (parsed.refreshToken)
    parts.push(`haihire_refresh_token=${parsed.refreshToken}`);
  parts.push("haihire_has_org=true");
  parsed.cookieHeader = parts.join("; ");

  return {
    ...parsed,
    userId: regBody.user.id,
    email,
    orgId,
    orgName: orgBody.organization?.name || orgName,
    orgSlug: orgBody.organization?.slug || slug,
    cookies: toPlaywrightCookies(parsed, baseURL, true),
  };
}
