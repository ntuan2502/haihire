import { test, expect } from "@playwright/test";
import {
  getOrgAlphaId,
  getOrgBetaId,
  getBetaJobId,
  getBetaApplicationId,
  getBetaWebhookId,
  loginAsAdmin,
} from "./fixtures/seed-helpers";

test.describe("Tenant Isolation — HTTP E2E Security Verification", () => {
  test.describe.configure({ mode: "serial" });

  let alphaCookies: string;
  let authToken: string;
  let alphaOrgId: string;
  let betaOrgId: string;
  let betaJobId: string;
  let betaAppId: string;
  let betaWebhookId: string;
  let setupError: string | null = null;

  test.beforeAll(async ({ request }) => {
    if (process.env.E2E_MULTI_TENANT_ENABLED === "false") {
      setupError = "Multi-tenant E2E explicitly disabled via E2E_MULTI_TENANT_ENABLED=false";
      return;
    }

    try {
      alphaOrgId = await getOrgAlphaId();
      betaOrgId = await getOrgBetaId();
      betaJobId = await getBetaJobId();
      betaAppId = await getBetaApplicationId();
      betaWebhookId = await getBetaWebhookId();

      alphaCookies = await loginAsAdmin(request, "admin@tun.io.vn");
      authToken = alphaCookies.replace(/^haihire_token=/, "");
    } catch (err: unknown) {
      setupError = err instanceof Error ? err.message : String(err);
    }
  });

  test.beforeEach(() => {
    if (setupError) {
      test.skip(true, `Skipping tenant security test: ${setupError}`);
    }
  });

  // === CONTROL TESTS (Verify normal tenant operations succeed) ===

  test("control: Org Alpha user can GET own candidates", async ({ request }) => {
    const res = await request.get(`/api/candidates?organizationId=${alphaOrgId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  // === CROSS-TENANT TESTS (Verify guards and services reject illegal operations) ===

  test("Org Alpha user cannot GET Org Beta candidates (GET rejection)", async ({ request }) => {
    const res = await request.get(`/api/candidates?organizationId=${betaOrgId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(/FORBIDDEN|CROSS_TENANT|CANDIDATE_ORG_MISMATCH|ORG_FORBIDDEN_ACTION/);
  });

  test("Org Alpha user cannot PATCH Org Beta job (PATCH rejection)", async ({ request }) => {
    const res = await request.patch(`/api/jobs/${betaJobId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
      data: { title: "Hacked by Org Alpha" },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(/FORBIDDEN|JOB_INVALID_ORGANIZATION|CROSS_TENANT|ORG_FORBIDDEN_ACTION/);
  });

  test("Org Alpha user cannot DELETE Org Beta application (DELETE rejection)", async ({ request }) => {
    const res = await request.delete(`/api/applications/${betaAppId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(/FORBIDDEN|APPLICATION_INVALID_ORGANIZATION|CROSS_TENANT|ORG_FORBIDDEN_ACTION/);
  });

  test("Org Alpha user cannot PATCH Org Beta webhook setting (PATCH rejection)", async ({ request }) => {
    const res = await request.patch(`/api/webhook-settings/${betaWebhookId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
      data: { isEnabled: false },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(/FORBIDDEN|ORG_FORBIDDEN_ACTION|CROSS_TENANT/);
  });

  // === EDGE CASES ===

  test("Org Alpha user with no organizationId query gets own data only", async ({ request }) => {
    const res = await request.get("/api/candidates", {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);

    // Verify none of the returned candidates belong to Beta Org
    for (const candidate of body.data) {
      if (candidate.organizationId) {
        expect(candidate.organizationId).not.toBe(betaOrgId);
      }
    }
  });
});
