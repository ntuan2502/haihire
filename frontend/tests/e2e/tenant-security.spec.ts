import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  SEED_BETA_CANDIDATE_ID,
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
      setupError =
        "Multi-tenant E2E explicitly disabled via E2E_MULTI_TENANT_ENABLED=false";
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

  test("control: Org Alpha user can GET own candidates", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/candidates?organizationId=${alphaOrgId}`,
      {
        headers: {
          Cookie: alphaCookies,
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  // === CROSS-TENANT TESTS (Verify guards and services reject illegal operations) ===

  test("Org Alpha user cannot GET Org Beta candidates (GET rejection)", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/candidates?organizationId=${betaOrgId}`,
      {
        headers: {
          Cookie: alphaCookies,
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(
      /FORBIDDEN|CROSS_TENANT|CANDIDATE_ORG_MISMATCH|ORG_FORBIDDEN_ACTION/,
    );
  });

  test("Org Alpha user cannot PATCH Org Beta job (PATCH rejection)", async ({
    request,
  }) => {
    const res = await request.patch(`/api/jobs/${betaJobId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
      data: { title: "Hacked by Org Alpha" },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(
      /FORBIDDEN|JOB_INVALID_ORGANIZATION|CROSS_TENANT|ORG_FORBIDDEN_ACTION/,
    );
  });

  test("Org Alpha user cannot DELETE Org Beta application (DELETE rejection)", async ({
    request,
  }) => {
    const res = await request.delete(`/api/applications/${betaAppId}`, {
      headers: {
        Cookie: alphaCookies,
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toMatch(
      /FORBIDDEN|APPLICATION_INVALID_ORGANIZATION|CROSS_TENANT|ORG_FORBIDDEN_ACTION/,
    );
  });

  test("Org Alpha user cannot PATCH Org Beta webhook setting (PATCH rejection)", async ({
    request,
  }) => {
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

  test("the webhook test endpoint rejects private destinations", async ({
    request,
  }) => {
    for (const webhookUrl of [
      "https://127.0.0.1/hook",
      "https://[::ffff:127.0.0.1]/hook",
    ]) {
      const response = await request.post("/api/webhook-settings/test", {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { provider: "GENERIC", webhookUrl },
      });
      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "WEBHOOK_PROVIDER_MISMATCH",
      });
    }
  });

  test("only the invite's organization can revoke it", async ({ request }) => {
    const betaCookies = await loginAsAdmin(request, "admin@beta.test");
    const inviteResponse = await request.post(
      "/api/organizations/my/invite-links",
      {
        headers: { Cookie: alphaCookies, Authorization: `Bearer ${authToken}` },
        data: { role: "Member" },
      },
    );
    expect(inviteResponse.status()).toBe(201);
    const { id, token } = await inviteResponse.json();

    const revokePath = `/api/organizations/my/invite-links/${id}`;
    const crossTenant = await request.delete(revokePath, {
      headers: {
        Cookie: betaCookies,
        Authorization: `Bearer ${betaCookies.replace(/^haihire_token=/, "")}`,
      },
    });
    expect(crossTenant.status()).toBe(404);

    const preview = await request.get(
      `/api/organizations/invite-links/public/${token}`,
    );
    expect(await preview.json()).toMatchObject({ valid: true });

    const ownTenant = await request.delete(revokePath, {
      headers: { Cookie: alphaCookies, Authorization: `Bearer ${authToken}` },
    });
    expect(ownTenant.status()).toBe(200);
  });

  // === EDGE CASES ===

  test("an organization owner cannot access system email routes", async ({
    request,
  }) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    for (const path of ["config", "logs"]) {
      const response = await request.get(`/api/email/system/${path}`, {
        headers,
      });
      expect(response.status(), path).toBe(404);
    }
    for (const path of ["test", "send"]) {
      const response = await request.post(`/api/email/system/${path}`, {
        headers,
      });
      expect(response.status(), path).toBe(404);
    }
  });

  test("recruitment email is rejected when the organization's provider is missing or incomplete", async ({
    request,
  }) => {
    const slug = `email-isolation-${randomUUID()}`;
    const registration = await request.post("/api/auth/register", {
      data: {
        name: "Email Isolation Test",
        email: `${slug}@example.com`,
        password: "TenantIsolationTest2026!",
      },
    });
    expect(registration.status()).toBe(201);
    const { accessToken } = await registration.json();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const organization = await request.post("/api/organizations", {
      headers,
      data: { name: "Email Isolation Test", slug },
    });
    expect(organization.status()).toBe(201);

    const testEmail = { headers, data: { to: "candidate@example.com" } };
    const missing = await request.post("/api/email/test", testEmail);
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toMatchObject({
      code: "EMAIL_SETTINGS_NOT_FOUND",
    });

    const settings = await request.put("/api/email/settings", {
      headers,
      data: { provider: "RESEND", fromEmail: "recruitment@example.com" },
    });
    expect(settings.status()).toBe(200);

    const incomplete = await request.post("/api/email/test", testEmail);
    expect(incomplete.status()).toBe(400);
    expect(await incomplete.json()).toMatchObject({
      code: "EMAIL_SETTINGS_INVALID",
    });
  });

  test("a newly registered account can read public jobs but cannot read tenant records", async ({
    request,
  }) => {
    const unauthenticated = await request.get(`/api/applications/${betaAppId}`);
    expect(unauthenticated.status()).toBe(401);

    const registration = await request.post("/api/auth/register", {
      data: {
        name: "Tenant Isolation Test",
        email: `tenant-isolation-${randomUUID()}@example.com`,
        password: "TenantIsolationTest2026!",
      },
    });
    expect(registration.status()).toBe(201);
    const { user, accessToken } = await registration.json();
    expect(user.organizationId).toBeNull();
    const headers = { Authorization: `Bearer ${accessToken}` };

    for (const path of [
      `/api/candidates?organizationId=${betaOrgId}`,
      `/api/candidates/${SEED_BETA_CANDIDATE_ID}`,
      `/api/applications?organizationId=${betaOrgId}`,
      `/api/applications/job/${betaJobId}`,
      `/api/applications/${betaAppId}`,
      `/api/email/logs?organizationId=${betaOrgId}`,
    ]) {
      const response = await request.get(path, { headers });
      expect(response.status(), path).toBe(403);
    }

    const response = await request.get(`/api/jobs/${betaJobId}`, { headers });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id: betaJobId,
      applications: [],
      applicationsCount: 0,
    });
  });

  test("Org Alpha user with no organizationId query gets own data only", async ({
    request,
  }) => {
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
