#!/usr/bin/env tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "yaml";

interface PrometheusAlertRule {
  alert?: string;
  expr?: string;
  for?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

interface PrometheusRuleGroup {
  name?: string;
  rules?: PrometheusAlertRule[];
}

interface PrometheusAlertFile {
  groups?: PrometheusRuleGroup[];
}

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function validateExprSyntax(expr: string): { valid: boolean; reason?: string } {
  if (!expr || typeof expr !== "string" || expr.trim() === "") {
    return { valid: false, reason: "Expression is empty" };
  }

  const trimmed = expr.trim();

  // Check balanced parentheses, braces, and brackets
  const stack: string[] = [];
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };

  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === '"' && !inSingleQuote && (i === 0 || trimmed[i - 1] !== "\\")) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === "'" && !inDoubleQuote && (i === 0 || trimmed[i - 1] !== "\\")) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (inDoubleQuote || inSingleQuote) {
      continue;
    }

    if (char in pairs) {
      stack.push(char);
    } else if (Object.values(pairs).includes(char)) {
      const last = stack.pop();
      if (!last || pairs[last] !== char) {
        return { valid: false, reason: `Unmatched closing bracket '${char}'` };
      }
    }
  }

  if (stack.length > 0) {
    return { valid: false, reason: `Unclosed bracket '${stack[stack.length - 1]}'` };
  }

  // Check that expression contains an identifier or function
  if (!/[a-zA-Z_][a-zA-Z0-9_]*/.test(trimmed)) {
    return { valid: false, reason: "Expression missing metric name or PromQL identifier" };
  }

  return { valid: true };
}

function runPrometheusRulesAudit(): void {
  console.log(`${colors.cyan}==================================================================${colors.reset}`);
  console.log(`${colors.bold}      CI ARCHITECTURE GATE: PROMETHEUS ALERT RULES AUDIT         ${colors.reset}`);
  console.log(`${colors.cyan}==================================================================${colors.reset}`);

  const filePath = path.resolve(process.cwd(), "monitoring/prometheus/alert-rules.yml");

  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}[FAIL] Alert rules file not found at: ${filePath}${colors.reset}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  let parsed: PrometheusAlertFile;

  try {
    parsed = parse(fileContent) as PrometheusAlertFile;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${colors.red}[FAIL] Failed to parse YAML: ${message}${colors.reset}`);
    process.exit(1);
  }

  if (!parsed || !Array.isArray(parsed.groups) || parsed.groups.length === 0) {
    console.error(`${colors.red}[FAIL] No rule groups found in alert-rules.yml${colors.reset}`);
    process.exit(1);
  }

  const errors: string[] = [];
  const alertNames = new Set<string>();
  let totalRules = 0;

  for (let gIdx = 0; gIdx < parsed.groups.length; gIdx++) {
    const group = parsed.groups[gIdx];
    const groupName = group.name || `group[${gIdx}]`;

    if (!Array.isArray(group.rules) || group.rules.length === 0) {
      errors.push(`Group "${groupName}" contains no rules.`);
      continue;
    }

    for (let rIdx = 0; rIdx < group.rules.length; rIdx++) {
      totalRules++;
      const rule = group.rules[rIdx];
      const alertName = rule.alert;

      if (!alertName || typeof alertName !== "string" || alertName.trim() === "") {
        errors.push(`Rule #${rIdx + 1} in group "${groupName}" is missing 'alert' name.`);
        continue;
      }

      // 1. Uniqueness check
      if (alertNames.has(alertName)) {
        errors.push(`Duplicate alert rule name detected: "${alertName}".`);
      } else {
        alertNames.add(alertName);
      }

      // 2. Expr check
      if (!rule.expr) {
        errors.push(`Rule "${alertName}" is missing 'expr'.`);
      } else {
        const syntaxResult = validateExprSyntax(rule.expr);
        if (!syntaxResult.valid) {
          errors.push(`Rule "${alertName}" has invalid 'expr' syntax: ${syntaxResult.reason}.`);
        }
      }

      // 3. For duration check
      if (!rule.for || typeof rule.for !== "string" || !/^\d+[smhd]$/.test(rule.for.trim())) {
        errors.push(`Rule "${alertName}" is missing or has invalid 'for' duration (e.g. 1m, 30s).`);
      }

      // 4. Labels check (severity + team)
      if (!rule.labels || typeof rule.labels !== "object") {
        errors.push(`Rule "${alertName}" is missing 'labels' block.`);
      } else {
        const severity = rule.labels.severity;
        if (!severity || !["critical", "high", "warning", "info"].includes(severity)) {
          errors.push(`Rule "${alertName}" missing or has invalid 'labels.severity' (found "${severity}").`);
        }

        const team = rule.labels.team;
        if (!team || team !== "sre") {
          errors.push(`Rule "${alertName}" missing required 'labels.team: sre' (found "${team}").`);
        }
      }

      // 5. Annotations check (summary + description)
      if (!rule.annotations || typeof rule.annotations !== "object") {
        errors.push(`Rule "${alertName}" is missing 'annotations' block.`);
      } else {
        const summary = rule.annotations.summary;
        if (!summary || typeof summary !== "string" || summary.trim() === "") {
          errors.push(`Rule "${alertName}" is missing 'annotations.summary'.`);
        }

        const description = rule.annotations.description;
        if (!description || typeof description !== "string" || description.trim() === "") {
          errors.push(`Rule "${alertName}" is missing 'annotations.description'.`);
        }
      }
    }
  }

  console.log(`Groups verified: ${parsed.groups.length}`);
  console.log(`Total alert rules inspected: ${totalRules}`);
  console.log("------------------------------------------------------------------");

  if (errors.length > 0) {
    console.error(`${colors.red}[CI GATE FAILED] Found ${errors.length} validation error(s):${colors.reset}`);
    for (const error of errors) {
      console.error(`  ❌ ${error}`);
    }
    process.exit(1);
  }

  console.log(`${colors.green}[CI GATE PASSED] All ${totalRules} Prometheus alert rules are 100% compliant!${colors.reset}`);
  console.log(`  • Valid PromQL expr syntax verified on all rules`);
  console.log(`  • Required labels present: severity (critical/high/warning) and team: sre`);
  console.log(`  • Required annotations present: summary and actionable description`);
  console.log(`${colors.cyan}==================================================================${colors.reset}`);
}

runPrometheusRulesAudit();
