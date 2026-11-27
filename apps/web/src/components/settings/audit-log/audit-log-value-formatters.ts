import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { getOrgRoleLabel } from "@/lib/roles";

export type AuditTranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

const JOB_STATUS_I18N_MAP: Record<string, string> = {
  PUBLISHED: "jobs.openStatus",
  DRAFT: "jobs.draftStatus",
  CLOSED: "jobs.closed",
  ARCHIVED: "jobs.archivedStatus",
};

const STAGE_I18N_MAP: Record<string, string> = {
  APPLIED: "pipeline.stages.applied",
  SCREENING: "pipeline.stages.screening",
  INTERVIEW: "pipeline.stages.interview",
  OFFER: "pipeline.stages.offer",
  HIRED: "pipeline.stages.hired",
  REJECTED: "pipeline.stages.rejected",
};

const ROLE_VALUE_SET = new Set([
  "OWNER",
  "ADMIN",
  "RECRUITER",
  "HIRING_MANAGER",
  "INTERVIEWER",
  "MEMBER",
]);

const LOCALIZATION_FIELD_MAP: Record<string, string> = {
  timezone: "settings.auditLog.metadataLabels.localizationFields.timezone",
  defaultLanguage:
    "settings.auditLog.metadataLabels.localizationFields.defaultLocale",
  defaultLocale:
    "settings.auditLog.metadataLabels.localizationFields.defaultLocale",
  defaultCurrency:
    "settings.auditLog.metadataLabels.localizationFields.defaultCurrency",
  nameDisplayOrder:
    "settings.auditLog.metadataLabels.localizationFields.nameDisplayOrder",
  dateFormat: "settings.auditLog.metadataLabels.localizationFields.dateFormat",
  timeFormat: "settings.auditLog.metadataLabels.localizationFields.timeFormat",
};

export function interpolateAuditText(
  template: string,
  params: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, val] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(val));
  }
  return result;
}

export function formatJobStatusLabel(
  status: string,
  t: AuditTranslateFn,
): string {
  const key = JOB_STATUS_I18N_MAP[status.toUpperCase()];
  if (!key) return status;
  const translated = t(key);
  return translated && translated !== key ? translated : status;
}

export function formatStageLabel(stage: string, t: AuditTranslateFn): string {
  const key = STAGE_I18N_MAP[stage.toUpperCase()];
  if (!key) return stage;
  const translated = t(key);
  return translated && translated !== key ? translated : stage;
}

/**
 * Formats a diff before/after value into a localized display string.
 */
export function formatAuditValue(
  field: string,
  value: unknown,
  t: AuditTranslateFn,
): string {
  if (field === "auditLogRetentionDays") {
    if (value === null || value === undefined || value === "") {
      return t("settings.auditLog.retentionUnlimitedValue");
    }
    if (typeof value === "number") {
      return t("settings.auditLog.retentionDaysValue", { days: value });
    }
  }
  if (value === null || value === undefined || value === "") {
    return t("settings.auditLog.valueEmpty");
  }
  if (value === "[REDACTED]") {
    return t("settings.auditLog.valueRedacted");
  }
  if (typeof value === "boolean") {
    if (field.includes(":")) {
      return value
        ? t("settings.auditLog.permissionGranted")
        : t("settings.auditLog.permissionRevoked");
    }
    return value ? t("common.yes") : t("common.no");
  }
  if (typeof value === "string") {
    if (
      (field === "role" || field === "membership") &&
      ROLE_VALUE_SET.has(value.toUpperCase())
    ) {
      return getOrgRoleLabel(value, t);
    }
    if (field === "status" && value.toUpperCase() in JOB_STATUS_I18N_MAP) {
      return formatJobStatusLabel(value, t);
    }
    if (field === "stage" && value.toUpperCase() in STAGE_I18N_MAP) {
      return formatStageLabel(value, t);
    }
    if (value.length > 120) {
      return `${value.slice(0, 117)}...`;
    }
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (field === "scoringConfig" && typeof value === "object") {
    const obj = value as { criteria?: unknown; autoScore?: unknown };
    const count = Array.isArray(obj.criteria) ? obj.criteria.length : 0;
    const auto = obj.autoScore ? t("common.yes") : t("common.no");
    return interpolateAuditText(
      t("settings.auditLog.metadataLabels.scoringConfigSummary", {
        count,
        auto,
      }),
      { count, auto },
    );
  }
  if (field === "applicationFormConfig" && typeof value === "object") {
    const obj = value as { screeningQuestions?: unknown };
    const count = Array.isArray(obj.screeningQuestions)
      ? obj.screeningQuestions.length
      : 0;
    return interpolateAuditText(
      t("settings.auditLog.metadataLabels.applicationFormSummary", {
        count,
      }),
      { count },
    );
  }
  return JSON.stringify(value);
}

/**
 * Extracts a concise browser/client and OS label from a raw User-Agent header.
 */
export function parseUserAgent(ua?: string | null): string | null {
  if (!ua?.trim()) return null;
  const trimmed = ua.trim();

  let browser = "";
  if (/Edg\//i.test(trimmed)) browser = "Edge";
  else if (/Chrome\//i.test(trimmed) && !/Chromium/i.test(trimmed))
    browser = "Chrome";
  else if (/Firefox\//i.test(trimmed)) browser = "Firefox";
  else if (/Safari\//i.test(trimmed) && !/Chrome\//i.test(trimmed))
    browser = "Safari";
  else if (/PostmanRuntime/i.test(trimmed)) browser = "Postman";
  else if (/curl\//i.test(trimmed)) browser = "curl";

  let os = "";
  if (/Windows/i.test(trimmed)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(trimmed)) os = "macOS";
  else if (/Android/i.test(trimmed)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(trimmed)) os = "iOS";
  else if (/Linux/i.test(trimmed)) os = "Linux";

  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  if (os) return os;
  return trimmed.slice(0, 64);
}

/**
 * Formats structured metadata lines for legacy organization audit logs without structured diffs.
 */
export function formatAuditMetadataLines(
  log: OrganizationAuditLogRecord,
  t: AuditTranslateFn,
): string[] {
  const metadata = log.metadata;
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  const lines: string[] = [];

  if (typeof record.role === "string" && record.role.trim()) {
    const roleLabel =
      record.role === "ALL"
        ? t("settings.auditLog.metadataLabels.allRoles")
        : getOrgRoleLabel(record.role, t);
    lines.push(
      interpolateAuditText(
        t("settings.auditLog.metadataLabels.roleTarget", { role: roleLabel }),
        { role: roleLabel },
      ),
    );
  }

  const permCount = Array.isArray(record.permissions)
    ? record.permissions.length
    : record.permissions && typeof record.permissions === "object"
      ? Object.keys(record.permissions).length
      : typeof record.changes === "number"
        ? record.changes
        : null;
  if (permCount !== null) {
    lines.push(
      interpolateAuditText(
        t("settings.auditLog.metadataLabels.permissionsUpdated", {
          count: permCount,
        }),
        { count: permCount },
      ),
    );
  }

  if (
    typeof record.oldRole === "string" &&
    typeof record.newRole === "string"
  ) {
    const oldRoleLabel = getOrgRoleLabel(record.oldRole, t);
    const newRoleLabel = getOrgRoleLabel(record.newRole, t);
    lines.push(
      interpolateAuditText(
        t("settings.auditLog.metadataLabels.roleChanged", {
          oldRole: oldRoleLabel,
          newRole: newRoleLabel,
        }),
        { oldRole: oldRoleLabel, newRole: newRoleLabel },
      ),
    );
  }

  if (log.action === "OWNERSHIP_TRANSFERRED") {
    lines.push(t("settings.auditLog.metadataLabels.ownershipTransferred"));
  }

  if (log.action === "ORG_LOCALIZATION_UPDATED") {
    const fieldLabels = Object.keys(record)
      .filter((k) => k in LOCALIZATION_FIELD_MAP)
      .map((k) => t(LOCALIZATION_FIELD_MAP[k]));
    if (fieldLabels.length > 0) {
      const joined = fieldLabels.join(", ");
      lines.push(
        interpolateAuditText(
          t("settings.auditLog.metadataLabels.localizationUpdated", {
            fields: joined,
          }),
          { fields: joined },
        ),
      );
    }
  }

  if (
    log.action === "ORG_LOGO_UPDATED" &&
    typeof record.fileName === "string"
  ) {
    lines.push(
      interpolateAuditText(
        t("settings.auditLog.metadataLabels.logoUpdated", {
          fileName: record.fileName,
        }),
        { fileName: record.fileName },
      ),
    );
  }

  if (log.action === "ORG_LOGO_REMOVED") {
    lines.push(t("settings.auditLog.metadataLabels.logoRemoved"));
  }

  return lines;
}
