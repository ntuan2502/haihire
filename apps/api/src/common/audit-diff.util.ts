import type { AuditChangeEntry } from "@haihire/shared";

const DEFAULT_REDACT_FIELDS = new Set([
  "password",
  "smtpPass",
  "apiKey",
  "resendApiKey",
  "sendgridApiKey",
  "webhookSecret",
  "secretToken",
  "token",
  "secret",
]);

const DEFAULT_REDACT_PATTERNS = [
  /password/i,
  /smtppass/i,
  /api[_]?key/i,
  /secret/i,
  /private[_]?key/i,
  /signing[_]?key/i,
  /(?:^|_)token$|(?<=[a-z])Token$/,
];

function normalizeAuditValue(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(normalizeAuditValue(item))).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries
    .map(
      ([key, val]) =>
        `${JSON.stringify(key)}:${stableStringify(normalizeAuditValue(val))}`,
    )
    .join(",")}}`;
}

function areAuditValuesEqual(left: unknown, right: unknown): boolean {
  const a = normalizeAuditValue(left);
  const b = normalizeAuditValue(right);
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && a !== null && b !== null) {
    return stableStringify(a) === stableStringify(b);
  }
  return false;
}

function hasMeaningfulValue(value: unknown): boolean {
  const normalized = normalizeAuditValue(value);
  if (normalized === null) return false;
  if (typeof normalized === "string" && normalized.length === 0) return false;
  return true;
}

function isRedactedField(field: string, customRedacts: Set<string>): boolean {
  const lower = field.toLowerCase();
  for (const candidate of DEFAULT_REDACT_FIELDS) {
    if (candidate.toLowerCase() === lower) return true;
  }
  for (const candidate of customRedacts) {
    if (candidate.toLowerCase() === lower) return true;
  }
  return DEFAULT_REDACT_PATTERNS.some((pattern) => pattern.test(field));
}

/**
 * Computes normalized Before -> After field diffs while automatically redacting
 * credentials and secret tokens whenever a redacted field changes.
 */
export function computeAuditDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  options?: { fields?: string[]; redactFields?: string[] },
): AuditChangeEntry[] {
  const beforeObj = before ?? {};
  const afterObj = after ?? {};
  const customRedacts = new Set(options?.redactFields ?? []);

  const keys = options?.fields
    ? options.fields
    : Array.from(
        new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]),
      );

  const changes: AuditChangeEntry[] = [];

  for (const field of keys) {
    const rawBefore = beforeObj[field];
    const rawAfter = afterObj[field];

    if (areAuditValuesEqual(rawBefore, rawAfter)) {
      continue;
    }

    if (isRedactedField(field, customRedacts)) {
      changes.push({
        field,
        before: hasMeaningfulValue(rawBefore) ? "[REDACTED]" : null,
        after: hasMeaningfulValue(rawAfter) ? "[REDACTED]" : null,
      });
      continue;
    }

    changes.push({
      field,
      before: normalizeAuditValue(rawBefore),
      after: normalizeAuditValue(rawAfter),
    });
  }

  return changes;
}
