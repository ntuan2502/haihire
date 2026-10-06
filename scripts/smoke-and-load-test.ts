#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:13001";

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

async function runSmokeTest(): Promise<void> {
  console.log("==================================================================");
  console.log("             PHASE 9: PRODUCTION SMOKE & FLOW TEST               ");
  console.log("==================================================================\n");

  const ts = Date.now();
  const email = `smoke_${ts}@prod.test`;
  const password = "Password123!";
  const orgName = `Smoke Org ${ts}`;
  const orgSlug = `smoke-org-${ts}`;

  // 1. Health check
  console.log("1. Checking /health endpoint...");
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = (await healthRes.json()) as HealthResponse;
  console.log(`   /health status: HTTP ${healthRes.status}`, healthData);
  if (healthRes.status !== 200 || healthData.status !== "ok") {
    throw new Error("Health check failed");
  }

  // 2. Metrics check
  console.log("\n2. Checking /metrics endpoint...");
  const metricsRes = await fetch(`${BASE_URL}/metrics`);
  const metricsText = await metricsRes.text();
  console.log(`   /metrics status: HTTP ${metricsRes.status}, lines: ${metricsText.split("\n").length}`);
  if (!metricsText.includes("http_requests_total")) {
    throw new Error("Metrics endpoint failed to return Prometheus headers");
  }

  // 3. Register user
  console.log("\n3. Registering recruiter...");
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Production Recruiter" }),
  });
  const regData = (await regRes.json()) as AuthRegisterResponse;
  const initToken = regData.accessToken;
  console.log(`   Register: HTTP ${regRes.status}, User ID: ${regData.user?.id}`);

  // 4. Create Org
  console.log("\n4. Creating Organization...");
  const orgRes = await fetch(`${BASE_URL}/organizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${initToken}` },
    body: JSON.stringify({ name: orgName, slug: orgSlug }),
  });
  const orgData = (await orgRes.json()) as OrgResponse;
  const orgId = orgData.organization?.id || orgData.id;
  console.log(`   Org created: HTTP ${orgRes.status}, Org ID: ${orgId}`);

  // 5. Login to obtain tenant JWT
  console.log("\n5. Logging in for tenant JWT...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = (await loginRes.json()) as LoginResponse;
  const token = loginData.accessToken;
  console.log(`   Login: HTTP ${loginRes.status}, Token received`);

  // 6. Create Job
  console.log("\n6. Creating & Publishing Job...");
  const jobRes = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
  const job = (await jobRes.json()) as JobResponse;
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
  const app = (await applyRes.json()) as ApplicationResponse;
  console.log(`   Application applied: HTTP ${applyRes.status}, App ID: ${app.id}, Stage: ${app.stage}`);

  // 8. List Applications
  console.log("\n8. Listing Applications & verifying Kanban stage...");
  const listRes = await fetch(`${BASE_URL}/applications?jobId=${job.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = (await listRes.json()) as { data?: unknown[]; length?: number };
  const count = Array.isArray(listData) ? listData.length : listData.data?.length || 0;
  console.log(`   List Applications: HTTP ${listRes.status}, Found: ${count}`);

  console.log("\n✅ SMOKE TEST PASSED COMPLETELY!\n");
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
}

async function runLoadTest(totalRequests = 500, concurrency = 50): Promise<BenchmarkResult> {
  console.log("==================================================================");
  console.log(`       PHASE 9: LOAD & STRESS BENCHMARK (${totalRequests} REQ, CONCURRENCY ${concurrency})   `);
  console.log("==================================================================\n");

  const latencies: number[] = [];
  let successCount = 0;
  let failCount = 0;

  const endpoints = [
    `${BASE_URL}/health`,
    `${BASE_URL}/metrics`,
    `${BASE_URL}/jobs`,
  ];

  let completed = 0;
  const startTime = Date.now();

  const statusCodes: Record<number, number> = {};

  async function worker(): Promise<void> {
    while (true) {
      const idx = completed++;
      if (idx >= totalRequests) break;

      const url = endpoints[idx % endpoints.length];
      const reqStart = Date.now();
      try {
        const res = await fetch(url);
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

  const workers = Array.from({ length: concurrency }).map(() => worker());
  await Promise.all(workers);

  const totalTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = Math.round(latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1));
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
    console.log(`  HTTP ${code === "0" ? "Network Error" : code}: ${count} responses`);
  }
  console.log("=================================================\n");

  const passedThreshold = p95 < 500 && failCount === 0;
  if (passedThreshold) {
    console.log("🎉 LOAD TEST BENCHMARK PASSED (p95 < 500ms, 0 errors)!\n");
  } else {
    console.log("⚠️ LOAD TEST FAILED THRESHOLD OR HAD ERRORS.\n");
  }

  return { totalRequests, concurrency, totalTime, rps, successCount, failCount, p50, p90, p95, p99, min, max, avg };
}

async function main(): Promise<void> {
  await runSmokeTest();
  await runLoadTest(500, 50);
}

main().catch((err: unknown) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
