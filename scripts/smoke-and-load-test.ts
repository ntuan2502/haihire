#!/usr/bin/env node

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:8080/api").replace(
  /\/$/,
  "",
);
const DIRECT_API_URL = process.env.DIRECT_API_URL?.replace(/\/$/, "");
const METRICS_TOKEN = process.env.METRICS_TOKEN?.trim();

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  uptime: number;
  services: {
    postgres: "up" | "down";
    redis: "up" | "down";
    minio: "up" | "down";
    database?: "up" | "down";
  };
  downServices?: string[];
}

interface AuthRegisterResponse {
  accessToken: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface OrgResponse {
  organization?: { id: string };
  id?: string;
}

interface LoginResponse {
  accessToken: string;
}

interface JobResponse {
  id: string;
  title: string;
}

interface ApplicationResponse {
  id: string;
  stage: string;
}

async function assertOkJson<T>(res: Response, stepName: string): Promise<T> {
  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 300);
    throw new Error(`${stepName} failed (HTTP ${res.status}): ${snippet}`);
  }
  return (await res.json()) as T;
}

async function runSmokeTest(): Promise<{ token: string }> {
  console.log(
    "==================================================================",
  );
  console.log(
    "             PHASE 9: PRODUCTION SMOKE & FLOW TEST               ",
  );
  console.log(
    "==================================================================\n",
  );

  const ts = Date.now();
  const email = `smoke_${ts}@prod.test`;
  const password = "Password123!";
  const orgName = `Smoke Org ${ts}`;
  const orgSlug = `smoke-org-${ts}`;

  // 1. Health check
  console.log("1. Checking /health endpoint...");
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await assertOkJson<HealthResponse>(
    healthRes,
    "Health check",
  );
  console.log(`   /health status: HTTP ${healthRes.status}`, healthData);
  if (healthData.status !== "ok") {
    throw new Error(`Health check degraded: ${JSON.stringify(healthData)}`);
  }

  // 2. Metrics check (protected by gateway external block & optional METRICS_TOKEN)
  console.log("\n2. Checking /metrics endpoint...");
  const metricsTarget = DIRECT_API_URL
    ? `${DIRECT_API_URL}/metrics`
    : `${BASE_URL}/metrics`;
  const metricsHeaders: Record<string, string> = METRICS_TOKEN
    ? { Authorization: `Bearer ${METRICS_TOKEN}` }
    : {};
  const metricsRes = await fetch(metricsTarget, { headers: metricsHeaders });
  if (
    !DIRECT_API_URL &&
    (metricsRes.status === 403 || metricsRes.status === 401)
  ) {
    console.log(
      `   /metrics status: HTTP ${metricsRes.status} (Gateway/token guard active as expected; set DIRECT_API_URL & METRICS_TOKEN to scrape directly)`,
    );
  } else {
    const metricsText = await metricsRes.text();
    console.log(
      `   /metrics status: HTTP ${metricsRes.status}, lines: ${metricsText.split("\n").length}`,
    );
    if (!metricsRes.ok || !metricsText.includes("http_requests_total")) {
      throw new Error(
        `Metrics endpoint check failed (HTTP ${metricsRes.status})`,
      );
    }
  }

  // 3. Register user
  console.log("\n3. Registering recruiter...");
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      firstName: "Recruiter",
      lastName: "Production",
    }),
  });
  const regData = await assertOkJson<AuthRegisterResponse>(
    regRes,
    "User registration",
  );
  const initToken = regData.accessToken;
  if (!initToken) {
    throw new Error("User registration did not return accessToken");
  }
  console.log(
    `   Register: HTTP ${regRes.status}, User ID: ${regData.user?.id}`,
  );

  // 4. Create Org
  console.log("\n4. Creating Organization...");
  const orgRes = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${initToken}`,
    },
    body: JSON.stringify({ name: orgName, slug: orgSlug }),
  });
  const orgData = await assertOkJson<OrgResponse>(
    orgRes,
    "Create organization",
  );
  const orgId = orgData.organization?.id || orgData.id;
  if (!orgId) {
    throw new Error("Create organization did not return organization ID");
  }
  console.log(`   Org created: HTTP ${orgRes.status}, Org ID: ${orgId}`);

  // 5. Login to obtain tenant JWT
  console.log("\n5. Logging in for tenant JWT...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await assertOkJson<LoginResponse>(loginRes, "Login");
  const token = loginData.accessToken;
  if (!token) {
    throw new Error("Login did not return tenant accessToken");
  }
  console.log(`   Login: HTTP ${loginRes.status}, Token received`);

  // 6. Create Job
  console.log("\n6. Creating & Publishing Job...");
  const jobRes = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Senior SRE / DevOps Engineer",
      department: "Infrastructure",
      location: "Remote",
      type: "FULL_TIME",
      workplace: "REMOTE",
      experienceLevel: "MID_LEVEL",
      status: "PUBLISHED",
      description: "Production infrastructure and reliability engineer.",
      organizationId: orgId,
    }),
  });
  const job = await assertOkJson<JobResponse>(jobRes, "Create job");
  if (!job.id) {
    throw new Error("Create job did not return job.id");
  }
  console.log(`   Job created: HTTP ${jobRes.status}, Job ID: ${job.id}`);

  // 7. Apply to Job
  console.log("\n7. Submitting Candidate Application...");
  const formData = new FormData();
  formData.append("jobId", job.id);
  formData.append("candidateName", "Alex DevOps");
  formData.append("candidateEmail", `alex_${ts}@candidate.test`);
  formData.append("candidatePhone", "+84988776655");
  const dummyPdf = new Blob(["%PDF-1.4\n%%EOF\n"], { type: "application/pdf" });
  formData.append("resume", dummyPdf, "alex_devops_resume.pdf");

  const applyRes = await fetch(`${BASE_URL}/applications/apply`, {
    method: "POST",
    body: formData,
  });
  const app = await assertOkJson<ApplicationResponse>(
    applyRes,
    "Candidate application",
  );
  if (!app.id) {
    throw new Error("Candidate application did not return application ID");
  }
  console.log(
    `   Application applied: HTTP ${applyRes.status}, App ID: ${app.id}, Stage: ${app.stage}`,
  );

  // 8. List Applications
  console.log("\n8. Listing Applications & verifying Kanban stage...");
  const listRes = await fetch(`${BASE_URL}/applications?jobId=${job.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await assertOkJson<{ data?: unknown[] } | unknown[]>(
    listRes,
    "List applications",
  );
  const count = Array.isArray(listData)
    ? listData.length
    : listData.data?.length || 0;
  console.log(`   List Applications: HTTP ${listRes.status}, Found: ${count}`);
  if (count < 1) {
    throw new Error("Expected at least 1 application in list result");
  }

  console.log("\n✅ SMOKE TEST PASSED COMPLETELY!\n");
  return { token };
}

interface BenchmarkResult {
  totalRequests: number;
  concurrency: number;
  totalTime: number;
  rps: number;
  successCount: number;
  failCount: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  passedThreshold: boolean;
}

async function runLoadTest(
  token: string,
  totalRequests = 500,
  concurrency = 50,
): Promise<BenchmarkResult> {
  console.log(
    "==================================================================",
  );
  console.log(
    `       PHASE 9: LOAD & STRESS BENCHMARK (${totalRequests} REQ, CONCURRENCY ${concurrency})   `,
  );
  console.log(
    "==================================================================\n",
  );

  const latencies: number[] = [];
  let successCount = 0;
  let failCount = 0;

  const targets: Array<{ url: string; headers?: Record<string, string> }> = [
    { url: `${BASE_URL}/health` },
    { url: `${BASE_URL}/jobs`, headers: { Authorization: `Bearer ${token}` } },
  ];
  if (DIRECT_API_URL && METRICS_TOKEN) {
    targets.push({
      url: `${DIRECT_API_URL}/metrics`,
      headers: { Authorization: `Bearer ${METRICS_TOKEN}` },
    });
  }

  let completed = 0;
  const startTime = Date.now();
  const statusCodes: Record<number, number> = {};

  async function worker(): Promise<void> {
    while (true) {
      const idx = completed++;
      if (idx >= totalRequests) break;

      const target = targets[idx % targets.length];
      const reqStart = Date.now();
      try {
        const res = await fetch(target.url, { headers: target.headers });
        const reqDuration = Date.now() - reqStart;
        latencies.push(reqDuration);
        statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
        if (res.status === 200) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        latencies.push(Date.now() - reqStart);
        statusCodes[0] = (statusCodes[0] || 0) + 1;
        failCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

  const totalTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = Math.round(
    latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1),
  );
  const rps = Math.round((totalRequests / (totalTime / 1000)) * 10) / 10;

  console.log("=================================================");
  console.log("               BENCHMARK RESULTS                 ");
  console.log("=================================================");
  console.log(`Total Requests:         ${totalRequests}`);
  console.log(`Concurrency:            ${concurrency}`);
  console.log(`Total Time:             ${totalTime} ms`);
  console.log(`Throughput:             ${rps} req/sec`);
  console.log(`Success (200 OK):       ${successCount}`);
  console.log(`Failed / Errors:        ${failCount}`);
  console.log(`Latency Min:            ${min} ms`);
  console.log(`Latency Avg:            ${avg} ms`);
  console.log(`Latency p50:            ${p50} ms`);
  console.log(`Latency p90:            ${p90} ms`);
  console.log(`Latency p95:            ${p95} ms (Target: < 500 ms)`);
  console.log(`Latency p99:            ${p99} ms`);
  console.log(`Latency Max:            ${max} ms`);
  console.log("Status Code Distribution:");
  for (const [code, count] of Object.entries(statusCodes)) {
    console.log(
      `  HTTP ${code === "0" ? "Network Error" : code}: ${count} responses`,
    );
  }
  console.log("=================================================\n");

  const passedThreshold = p95 < 500 && failCount === 0;
  if (passedThreshold) {
    console.log("🎉 LOAD TEST BENCHMARK PASSED (p95 < 500ms, 0 errors)!\n");
  } else {
    console.log("⚠️ LOAD TEST FAILED THRESHOLD OR HAD ERRORS.\n");
  }

  return {
    totalRequests,
    concurrency,
    totalTime,
    rps,
    successCount,
    failCount,
    p50,
    p90,
    p95,
    p99,
    min,
    max,
    avg,
    passedThreshold,
  };
}

async function cleanupSmokeOrg(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const res = await fetch(`${BASE_URL}/organizations/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`🧹 Cleanup smoke organization: HTTP ${res.status}`);
  } catch (err: unknown) {
    console.warn("Cleanup smoke organization skipped:", err);
  }
}

async function main(): Promise<void> {
  let token: string | undefined;
  try {
    const smoke = await runSmokeTest();
    token = smoke.token;
    const bench = await runLoadTest(token, 500, 50);
    if (!bench.passedThreshold) {
      throw new Error(
        `Load test failed threshold: p95=${bench.p95}ms, failCount=${bench.failCount}`,
      );
    }
  } finally {
    await cleanupSmokeOrg(token);
  }
}

main().catch((err: unknown) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
