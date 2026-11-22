import { test, expect } from "./fixtures/auth-fixtures";
import { KanbanPipelinePage } from "./pages/KanbanPipelinePage";
import { randomUUID } from "node:crypto";

test.describe("Tier 4: Real-World Recruitment Lifecycle Workloads (E2E Web)", () => {
  let createdJobId: string | undefined;
  let createdJob2Id: string | undefined;
  let createdCandidateId: string | undefined;

  test.afterEach(async ({ adminPage }) => {
    if (createdJobId) {
      await adminPage.request.delete(`/api/jobs/${createdJobId}`);
      createdJobId = undefined;
    }
    if (createdJob2Id) {
      await adminPage.request.delete(`/api/jobs/${createdJob2Id}`);
      createdJob2Id = undefined;
    }
    if (createdCandidateId) {
      await adminPage.request.delete(`/api/candidates/${createdCandidateId}`);
      createdCandidateId = undefined;
    }
  });

  test("Scenario 1: Sourcing to Hire lifecycle (public apply -> review -> pipeline advance)", async ({
    page,
    adminPage,
  }) => {
    // 1. Recruiter creates a target job for this lifecycle test
    const uniqueJobTitle = `E2E Lifecycle Job ${randomUUID().slice(0, 8)}`;
    const jobRes = await adminPage.request.post("/api/jobs", {
      data: {
        title: uniqueJobTitle,
        department: "Engineering",
        location: "Hanoi, Vietnam",
        description: "Lifecycle workload test role",
        status: "PUBLISHED",
      },
    });
    expect(jobRes.ok()).toBe(true);
    const jobData = (await jobRes.json()) as { id: string };
    createdJobId = jobData.id;

    // 2. Anonymous candidate applies to the job via Public Apply
    const candidateEmail = `lifecycle-${Date.now()}@example.com`;
    const applyRes = await page.request.post("/api/applications/apply", {
      data: {
        jobId: createdJobId,
        firstName: "Thanh",
        lastName: "Vu",
        email: candidateEmail,
      },
    });
    expect(applyRes.ok()).toBe(true);
    const applyData = (await applyRes.json()) as {
      id: string;
      candidateId?: string;
    };
    if (applyData.candidateId) {
      createdCandidateId = applyData.candidateId;
    } else {
      const appDetailRes = await adminPage.request.get(
        `/api/applications/${applyData.id}`,
      );
      if (appDetailRes.ok()) {
        createdCandidateId =
          ((await appDetailRes.json()) as { candidateId?: string })
            .candidateId ?? null;
      }
    }

    // 3. Recruiter accesses Kanban Pipeline for the created job
    const kanban = new KanbanPipelinePage(adminPage);
    await kanban.goto(createdJobId, "APPLIED");

    // 4. Verify candidate card appears in APPLIED column
    const candidateCard = adminPage
      .locator('[data-testid^="candidate-card-"]')
      .first();
    await expect(candidateCard).toBeVisible({ timeout: 12000 });

    const cardAttr = await candidateCard.getAttribute("data-testid");
    const candidateId = cardAttr?.replace("candidate-card-", "");
    expect(candidateId).toBeDefined();

    // 5. Advance candidate from APPLIED to SCREENING
    await kanban.dragCandidate(candidateId!, "APPLIED", "SCREENING");

    // Verify stage tab reflects updated candidate
    await kanban.expectCandidateInStage(candidateId!, "SCREENING");
  });

  test("Scenario 2: Multi-tenant recruiter cross-organization boundary validation", async ({
    adminPage,
    betaAdminPage,
  }) => {
    // 1. Alpha Admin accesses candidates dashboard
    await adminPage.goto("/candidates");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list'], h1").first(),
    ).toBeVisible({ timeout: 10000 });

    // Verify Alpha Admin view loads successfully
    expect(adminPage.url()).toContain("/candidates");

    // 2. Beta Admin accesses Beta candidates dashboard
    await betaAdminPage.goto("/candidates");
    await expect(
      betaAdminPage
        .locator("table, [data-testid='candidate-list'], h1")
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Verify Beta Admin view loads independently
    expect(betaAdminPage.url()).toContain("/candidates");

    // 3. Verify Beta Admin cannot access Alpha's private settings via API
    const crossRes = await betaAdminPage.request.get(
      "/api/organizations/00000000-0000-4000-8000-000000000002",
    );
    // Strictly 403 Forbidden
    expect(crossRes.status()).toBe(403);
  });

  test("Scenario 3: Soft-delete candidate re-application creates independent active profile", async ({
    page,
    adminPage,
  }) => {
    // 1. Create Job 1 and Job 2
    const job1Res = await adminPage.request.post("/api/jobs", {
      data: {
        title: `Job Alpha ${randomUUID().slice(0, 6)}`,
        department: "Engineering",
        location: "Hanoi",
        description: "Job 1 description",
        status: "PUBLISHED",
      },
    });
    expect(job1Res.ok()).toBe(true);
    createdJobId = ((await job1Res.json()) as { id: string }).id;

    const job2Res = await adminPage.request.post("/api/jobs", {
      data: {
        title: `Job Beta ${randomUUID().slice(0, 6)}`,
        department: "Product",
        location: "Hanoi",
        description: "Job 2 description",
        status: "PUBLISHED",
      },
    });
    expect(job2Res.ok()).toBe(true);
    createdJob2Id = ((await job2Res.json()) as { id: string }).id;

    // 2. Candidate applies to Job 1
    const candidateEmail = `reapply-ui-${Date.now()}@example.com`;
    const apply1Res = await page.request.post("/api/applications/apply", {
      data: {
        jobId: createdJobId,
        firstName: "Thuy",
        lastName: "Le",
        email: candidateEmail,
      },
    });
    expect(apply1Res.ok()).toBe(true);
    const apply1Data = (await apply1Res.json()) as {
      id: string;
      candidateId?: string;
    };
    const app1DetailRes = await adminPage.request.get(
      `/api/applications/${apply1Data.id}`,
    );
    expect(app1DetailRes.ok()).toBe(true);
    const initialCandidateId =
      apply1Data.candidateId ??
      ((await app1DetailRes.json()) as { candidateId: string }).candidateId;
    expect(initialCandidateId).toBeDefined();

    // 3. Recruiter soft-deletes the initial candidate
    const deleteRes = await adminPage.request.delete(
      `/api/candidates/${initialCandidateId}`,
    );
    expect(deleteRes.ok()).toBe(true);

    // 4. Candidate re-applies to Job 2 with exact same email
    const apply2Res = await page.request.post("/api/applications/apply", {
      data: {
        jobId: createdJob2Id,
        firstName: "Thuy",
        lastName: "Le",
        email: candidateEmail,
      },
    });
    expect(apply2Res.ok()).toBe(true);
    const apply2Data = (await apply2Res.json()) as {
      id: string;
      candidateId?: string;
    };
    const app2DetailRes = await adminPage.request.get(
      `/api/applications/${apply2Data.id}`,
    );
    expect(app2DetailRes.ok()).toBe(true);
    const newCandidateId =
      apply2Data.candidateId ??
      ((await app2DetailRes.json()) as { candidateId: string }).candidateId;
    expect(newCandidateId).toBeDefined();
    createdCandidateId = newCandidateId;

    // 5. Verify in UI that active candidate list reflects new active profile without resurrecting old candidate ID
    expect(newCandidateId).not.toBe(initialCandidateId);

    await adminPage.goto("/candidates");
    await expect(
      adminPage.locator("table, [data-testid='candidate-list']").first(),
    ).toBeVisible({ timeout: 10000 });

    const pageContent = await adminPage.locator("body").textContent();
    expect(pageContent).toContain(candidateEmail);
  });

  test("Scenario 4: Concurrent recruiter OCC pipeline updates reject stale version with 409", async ({
    adminPage,
  }) => {
    // 1. Create a job and application
    const jobRes = await adminPage.request.post("/api/jobs", {
      data: {
        title: `OCC Pipeline Job ${randomUUID().slice(0, 6)}`,
        department: "Engineering",
        location: "Remote",
        description: "OCC concurrency test",
        status: "PUBLISHED",
      },
    });
    expect(jobRes.ok()).toBe(true);
    createdJobId = ((await jobRes.json()) as { id: string }).id;

    const email = `occ-${Date.now()}@example.com`;
    const applyRes = await adminPage.request.post("/api/applications/apply", {
      data: {
        jobId: createdJobId,
        firstName: "Concurrent",
        lastName: "Tester",
        email,
      },
    });
    expect(applyRes.ok()).toBe(true);
    const appData = (await applyRes.json()) as {
      id: string;
      candidateId: string;
    };
    createdCandidateId = appData.candidateId;

    // 2. Recruiter 1 successfully updates stage to SCREENING with version 1
    const update1Res = await adminPage.request.patch(
      `/api/applications/${appData.id}/stage`,
      {
        data: {
          stage: "SCREENING",
          version: 1,
        },
      },
    );
    expect(update1Res.status()).toBe(200);

    // 3. Recruiter 2 attempts update with stale version 1 (DB version has advanced)
    const update2Res = await adminPage.request.patch(
      `/api/applications/${appData.id}/stage`,
      {
        data: {
          stage: "INTERVIEW",
          version: 1,
        },
      },
    );
    expect(update2Res.status()).toBe(409);
    const errorBody = (await update2Res.json()) as { code?: string };
    expect(errorBody.code).toBe("APPLICATION_STAGE_CONFLICT");
  });

  test("Scenario 5: Dynamic RBAC permission gating on member actions", async ({
    memberPage,
  }) => {
    // Member account lacks administrative permissions (e.g. webhook settings creation)
    await memberPage.goto("/settings/integrations");
    await expect(memberPage.locator("main, h1").first()).toBeVisible({
      timeout: 10000,
    });

    const accessBarrier = memberPage.locator(
      "[data-testid='status-state-403'], text=/403|access denied|không có quyền/i",
    );
    await expect(accessBarrier.first()).toBeVisible({ timeout: 10000 });

    const addBtn = memberPage.locator(
      "#add-webhook-btn, [data-testid='add-webhook-btn']",
    );
    await expect(addBtn).not.toBeVisible();
  });
});
