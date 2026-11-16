import type { APIRequestContext } from "@playwright/test";

/**
 * Deterministic IDs matching apps/api/src/prisma/seed.ts
 */
export const SEED_ALPHA_ORG_ID = "00000000-0000-4000-8000-000000000002";
export const SEED_BETA_ORG_ID = "00000000-0000-4000-8000-0000000000b2";
export const SEED_BETA_JOB_ID = "00000000-0000-4000-8000-0000000000b3";
export const SEED_BETA_CANDIDATE_ID = "00000000-0000-4000-8000-0000000000b4";
export const SEED_BETA_APP_ID = "00000000-0000-4000-8000-0000000000b5";
export const SEED_BETA_WEBHOOK_ID = "00000000-0000-4000-8000-0000000000b6";

export async function getOrgAlphaId(): Promise<string> {
  return SEED_ALPHA_ORG_ID;
}

export async function getOrgBetaId(): Promise<string> {
  return SEED_BETA_ORG_ID;
}

export async function getBetaJobId(): Promise<string> {
  return SEED_BETA_JOB_ID;
}

export async function getBetaApplicationId(): Promise<string> {
  return SEED_BETA_APP_ID;
}

export async function getBetaWebhookId(): Promise<string> {
  return SEED_BETA_WEBHOOK_ID;
}

/**
 * Authenticates user through /api/auth/login and captures auth cookie string.
 */
export async function loginAsAdmin(
  request: APIRequestContext,
  email = "admin@tun.io.vn",
  password = process.env.DEMO_SEED_PASSWORD ||
    process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
    "dev-seed-password-2026",
): Promise<string> {
  const loginRes = await request.post("/api/auth/login", {
    data: { email, password },
  });

  if (!loginRes.ok()) {
    throw new Error(
      `Login failed for ${email} with status ${loginRes.status()}: ${await loginRes.text()}`,
    );
  }

  // 1. Capture and parse all Set-Cookie headers
  const headers = loginRes.headersArray();
  const setCookieHeaders = headers.filter(
    (h) => h.name.toLowerCase() === "set-cookie",
  );

  let tokenCookie: string | undefined;
  let refreshCookie: string | undefined;

  for (const h of setCookieHeaders) {
    const tokenMatch = h.value.match(/haihire_token=([^;]+)/);
    if (tokenMatch) {
      tokenCookie = tokenMatch[1];
    }
    const refreshMatch = h.value.match(/haihire_refresh_token=([^;]+)/);
    if (refreshMatch) {
      refreshCookie = refreshMatch[1];
    }
  }

  if (!tokenCookie) {
    throw new Error(
      `Could not extract haihire_token from Set-Cookie headers in login response. Status: ${loginRes.status()}`,
    );
  }

  // Return composite Cookie header string containing both cookies if present
  return refreshCookie
    ? `haihire_token=${tokenCookie}; haihire_refresh_token=${refreshCookie}`
    : `haihire_token=${tokenCookie}`;
}
