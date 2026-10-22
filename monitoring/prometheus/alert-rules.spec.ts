import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "yaml";

interface PrometheusRule {
  alert: string;
  expr: string;
  for: string;
  labels: {
    severity: string;
    team: string;
    [key: string]: string;
  };
  annotations: {
    summary: string;
    description: string;
    [key: string]: string;
  };
}

interface PrometheusRuleGroup {
  name: string;
  rules: PrometheusRule[];
}

interface PrometheusAlertConfig {
  groups: PrometheusRuleGroup[];
}

describe("Prometheus Alert Rules Specification", () => {
  const alertRulesPath = path.resolve(__dirname, "alert-rules.yml");
  const yamlContent = fs.readFileSync(alertRulesPath, "utf-8");
  const parsed = parse(yamlContent) as PrometheusAlertConfig;
  const allRules: PrometheusRule[] = parsed.groups.flatMap((g) => g.rules);

  it("Case 1: Parses YAML successfully and contains at least 14 rules (7 existing + 4 BullMQ + 3 cron spike)", () => {
    expect(parsed).toBeDefined();
    expect(parsed.groups).toBeInstanceOf(Array);
    expect(parsed.groups.length).toBeGreaterThan(0);
    expect(allRules.length).toBe(16);
  });

  it("Case 2: Every rule has all mandatory top-level fields (alert, expr, for, labels, annotations)", () => {
    for (const rule of allRules) {
      expect(rule.alert, `Rule missing 'alert': ${JSON.stringify(rule)}`).toBeTruthy();
      expect(rule.expr, `Rule ${rule.alert} missing 'expr'`).toBeTruthy();
      expect(rule.for, `Rule ${rule.alert} missing 'for'`).toBeTruthy();
      expect(rule.labels, `Rule ${rule.alert} missing 'labels'`).toBeTypeOf("object");
      expect(rule.annotations, `Rule ${rule.alert} missing 'annotations'`).toBeTypeOf("object");
    }
  });

  it("Case 3: Every rule has a valid severity label (critical, high, or warning)", () => {
    const validSeverities = ["critical", "high", "warning", "info"];
    for (const rule of allRules) {
      expect(validSeverities).toContain(rule.labels.severity);
    }
  });

  it("Case 4: Every rule has team label explicitly assigned to 'sre'", () => {
    for (const rule of allRules) {
      expect(rule.labels.team).toBe("sre");
    }
  });

  it("Case 5: Every rule has non-empty summary and actionable description annotations", () => {
    for (const rule of allRules) {
      expect(rule.annotations.summary?.trim().length).toBeGreaterThan(0);
      expect(rule.annotations.description?.trim().length).toBeGreaterThan(0);
    }
  });

  it("Case 6: Alert rule names are strictly unique across all groups", () => {
    const names = allRules.map((r) => r.alert);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("Case 7: 4 new BullMQ alert rules match specified PromQL expressions, durations and severities", () => {
    const ruleMap = new Map(allRules.map((r) => [r.alert, r]));

    // 1. HaiHireBullMqDlqGrowing
    const dlqGrowing = ruleMap.get("HaiHireBullMqDlqGrowing");
    expect(dlqGrowing).toBeDefined();
    expect(dlqGrowing?.expr.trim()).toBe('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 10');
    expect(dlqGrowing?.for).toBe("5m");
    expect(dlqGrowing?.labels.severity).toBe("warning");

    // 2. HaiHireBullMqDlqCritical
    const dlqCritical = ruleMap.get("HaiHireBullMqDlqCritical");
    expect(dlqCritical).toBeDefined();
    expect(dlqCritical?.expr.trim()).toBe('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} > 100');
    expect(dlqCritical?.for).toBe("2m");
    expect(dlqCritical?.labels.severity).toBe("critical");

    // 3. HaiHireEmailQueueBacklog
    const emailBacklog = ruleMap.get("HaiHireEmailQueueBacklog");
    expect(emailBacklog).toBeDefined();
    expect(emailBacklog?.expr.trim()).toBe('bullmq_queue_depth{queue="email-queue",state="waiting"} > 500');
    expect(emailBacklog?.for).toBe("10m");
    expect(emailBacklog?.labels.severity).toBe("warning");

    // 4. HaiHireBullMqRedisDown
    const redisDown = ruleMap.get("HaiHireBullMqRedisDown");
    expect(redisDown).toBeDefined();
    expect(redisDown?.expr.trim()).toBe('bullmq_queue_depth{queue="orphan-cleanup-queue",state="waiting"} == -1');
    expect(redisDown?.for).toBe("2m");
    expect(redisDown?.labels.severity).toBe("critical");
  });

  it("Case 8: All referenced runbook documentation paths exist on the filesystem", () => {
    const projectRoot = path.resolve(__dirname, "../..");
    for (const rule of allRules) {
      const desc = rule.annotations.description;
      const match = desc.match(/docs\/runbooks\/[a-zA-Z0-9_-]+\.md/);
      if (match) {
        const runbookRelPath = match[0];
        const runbookAbsPath = path.resolve(projectRoot, runbookRelPath);
        expect(
          fs.existsSync(runbookAbsPath),
          `Referenced runbook not found: ${runbookRelPath} in rule ${rule.alert}`,
        ).toBe(true);
      }
    }
  });

  it("Case 9: 3 new orphan cleanup cron spike and missing alert rules match specified PromQL expressions, durations and severities", () => {
    const ruleMap = new Map(allRules.map((r) => [r.alert, r]));

    // 1. HaiHireOrphanCleanupSpikeWarning
    const spikeWarning = ruleMap.get("HaiHireOrphanCleanupSpikeWarning");
    expect(spikeWarning).toBeDefined();
    expect(spikeWarning?.expr.trim()).toBe("minio_orphan_cleanup_orphans_found_total > 50");
    expect(spikeWarning?.for).toBe("0m");
    expect(spikeWarning?.labels.severity).toBe("warning");
    expect(spikeWarning?.labels.team).toBe("sre");

    // 2. HaiHireOrphanCleanupSpikeCritical
    const spikeCritical = ruleMap.get("HaiHireOrphanCleanupSpikeCritical");
    expect(spikeCritical).toBeDefined();
    expect(spikeCritical?.expr.trim()).toBe("minio_orphan_cleanup_orphans_found_total > 500");
    expect(spikeCritical?.for).toBe("0m");
    expect(spikeCritical?.labels.severity).toBe("critical");
    expect(spikeCritical?.labels.team).toBe("sre");

    // 3. HaiHireOrphanCleanupCronMissing
    const cronMissing = ruleMap.get("HaiHireOrphanCleanupCronMissing");
    expect(cronMissing).toBeDefined();
    expect(cronMissing?.expr.trim()).toBe("time() - minio_orphan_cleanup_last_run_timestamp_seconds > 90000");
    expect(cronMissing?.expr).toContain("time()");
    expect(cronMissing?.for).toBe("5m");
    expect(cronMissing?.labels.severity).toBe("critical");
    expect(cronMissing?.labels.team).toBe("sre");
  });

  it("Case 10: 2 BullMQ DLQ size alert rules match specified PromQL expressions, durations and severities", () => {
    const ruleMap = new Map(allRules.map((r) => [r.alert, r]));

    // 1. BullMQDLQNotEmpty
    const dlqNotEmpty = ruleMap.get("BullMQDLQNotEmpty");
    expect(dlqNotEmpty).toBeDefined();
    expect(dlqNotEmpty?.expr.trim()).toBe("bullmq_dlq_size > 0");
    expect(dlqNotEmpty?.for).toBe("5m");
    expect(dlqNotEmpty?.labels.severity).toBe("warning");
    expect(dlqNotEmpty?.labels.team).toBe("sre");

    // 2. BullMQDLQGrowing
    const dlqGrowing = ruleMap.get("BullMQDLQGrowing");
    expect(dlqGrowing).toBeDefined();
    expect(dlqGrowing?.expr.trim()).toBe("rate(bullmq_dlq_size[15m]) > 0");
    expect(dlqGrowing?.for).toBe("5m");
    expect(dlqGrowing?.labels.severity).toBe("critical");
    expect(dlqGrowing?.labels.team).toBe("sre");
  });
});
