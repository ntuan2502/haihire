import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { getOrgRoleLabel } from "@/lib/roles";
import type { CustomSelectOption } from "@/components/shared";

const RESOURCE_KEYS = new Set([
  "ORGANIZATION",
  "MEMBER",
  "INVITATION",
  "ROLE_PERMISSIONS",
  "EMAIL",
  "WEBHOOK",
  "JOB",
  "CANDIDATE",
  "APPLICATION",
  "INTERVIEW",
  "SOURCING_LINK",
  "SYSTEM",
]);

const KNOWN_FIELD_LABELS = new Set([
  "name",
  "slug",
  "logoObjectKey",
  "auditLogRetentionDays",
  "ownerId",
  "role",
  "membership",
  "inviteType",
  "invitedEmail",
  "previousLinkId",
  "overridesCount",
  "provider",
  "modelId",
  "baseUrl",
  "autoScoreApplications",
  "fromName",
  "fromEmail",
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPass",
  "resendApiKey",
  "sendgridApiKey",
  "type",
  "subject",
  "body",
  "enabled",
  "templateId",
  "eventType",
  "webhookUrl",
  "secretToken",
  "chatId",
  "isEnabled",
  "defaultLanguage",
  "timezone",
  "dateFormat",
  "timeFormat",
  "nameDisplayOrder",
  "defaultCurrency",
  "title",
  "department",
  "location",
  "workplace",
  "experienceLevel",
  "applicationFormConfig",
  "scoringConfig",
  "openings",
  "salaryRange",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "applicationDeadline",
  "startDate",
  "firstName",
  "lastName",
  "displayName",
  "email",
  "phone",
  "gender",
  "dateOfBirth",
  "resumeFileName",
  "stage",
  "rejectionReason",
  "scheduledAt",
  "format",
  "linkOrLocation",
  "interviewer",
  "round",
  "notes",
  "source",
  "customSource",
  "jobId",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "isActive",
]);

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

const DELETED_ENTITY_ACTIONS = new Set([
  "JOB_DELETED",
  "CANDIDATE_DELETED",
  "APPLICATION_DELETED",
  "INTERVIEW_CANCELED",
  "SOURCING_LINK_DELETED",
]);

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

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

interface AuditActionMeta {
  resource: string;
  labelKey: string;
  className: string;
}

const ACTION_BADGE_CONFIG: Record<string, AuditActionMeta> = {
  ROLE_PERMISSIONS_UPDATED: {
    resource: "ROLE_PERMISSIONS",
    labelKey: "settings.auditLog.actionRolePermissionsUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  ROLE_PERMISSIONS_RESET: {
    resource: "ROLE_PERMISSIONS",
    labelKey: "settings.auditLog.actionRolePermissionsReset",
    className:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  MEMBER_ROLE_CHANGED: {
    resource: "MEMBER",
    labelKey: "settings.auditLog.actionMemberRoleChanged",
    className:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  MEMBER_JOINED: {
    resource: "MEMBER",
    labelKey: "settings.auditLog.actionMemberJoined",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  MEMBER_REMOVED: {
    resource: "MEMBER",
    labelKey: "settings.auditLog.actionMemberRemoved",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  MEMBER_LEFT: {
    resource: "MEMBER",
    labelKey: "settings.auditLog.actionMemberLeft",
    className:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  OWNERSHIP_TRANSFERRED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOwnershipTransferred",
    className:
      "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  ORG_UPDATED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOrgUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  ORG_DELETED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOrgDeleted",
    className:
      "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  ORG_LOCALIZATION_UPDATED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOrgLocalizationUpdated",
    className:
      "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  ORG_LOGO_UPDATED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOrgLogoUpdated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  ORG_LOGO_REMOVED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOrgLogoRemoved",
    className:
      "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  ORG_AUDIT_RETENTION_UPDATED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionOrgAuditRetentionUpdated",
    className:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  INVITE_CREATED: {
    resource: "INVITATION",
    labelKey: "settings.auditLog.actionInviteCreated",
    className:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  INVITE_RESENT: {
    resource: "INVITATION",
    labelKey: "settings.auditLog.actionInviteResent",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  INVITE_REVOKED: {
    resource: "INVITATION",
    labelKey: "settings.auditLog.actionInviteRevoked",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  EMAIL_SETTINGS_UPDATED: {
    resource: "EMAIL",
    labelKey: "settings.auditLog.actionEmailSettingsUpdated",
    className:
      "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  EMAIL_TEMPLATE_CREATED: {
    resource: "EMAIL",
    labelKey: "settings.auditLog.actionEmailTemplateCreated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  EMAIL_TEMPLATE_UPDATED: {
    resource: "EMAIL",
    labelKey: "settings.auditLog.actionEmailTemplateUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  EMAIL_TEMPLATE_DELETED: {
    resource: "EMAIL",
    labelKey: "settings.auditLog.actionEmailTemplateDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  EMAIL_FLOW_UPDATED: {
    resource: "EMAIL",
    labelKey: "settings.auditLog.actionEmailFlowUpdated",
    className:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  AI_SETTINGS_UPDATED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionAiSettingsUpdated",
    className:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  AI_SETTINGS_DELETED: {
    resource: "ORGANIZATION",
    labelKey: "settings.auditLog.actionAiSettingsDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  DOWNLOAD_DOCUMENT: {
    resource: "CANDIDATE",
    labelKey: "settings.auditLog.actionDownloadDocument",
    className:
      "bg-slate-100 dark:bg-slate-900/40 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  VIEW_PROFILE: {
    resource: "CANDIDATE",
    labelKey: "settings.auditLog.actionViewProfile",
    className:
      "bg-slate-100 dark:bg-slate-900/40 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  WEBHOOK_CREATED: {
    resource: "WEBHOOK",
    labelKey: "settings.auditLog.actionWebhookCreated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  WEBHOOK_UPDATED: {
    resource: "WEBHOOK",
    labelKey: "settings.auditLog.actionWebhookUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  WEBHOOK_DELETED: {
    resource: "WEBHOOK",
    labelKey: "settings.auditLog.actionWebhookDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  JOB_CREATED: {
    resource: "JOB",
    labelKey: "settings.auditLog.actionJobCreated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  JOB_UPDATED: {
    resource: "JOB",
    labelKey: "settings.auditLog.actionJobUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  JOB_STATUS_CHANGED: {
    resource: "JOB",
    labelKey: "settings.auditLog.actionJobStatusChanged",
    className:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  JOB_DELETED: {
    resource: "JOB",
    labelKey: "settings.auditLog.actionJobDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  CANDIDATE_CREATED: {
    resource: "CANDIDATE",
    labelKey: "settings.auditLog.actionCandidateCreated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  CANDIDATE_UPDATED: {
    resource: "CANDIDATE",
    labelKey: "settings.auditLog.actionCandidateUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  CANDIDATE_DELETED: {
    resource: "CANDIDATE",
    labelKey: "settings.auditLog.actionCandidateDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  APPLICATION_CREATED: {
    resource: "APPLICATION",
    labelKey: "settings.auditLog.actionApplicationCreated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  APPLICATION_STAGE_CHANGED: {
    resource: "APPLICATION",
    labelKey: "settings.auditLog.actionApplicationStageChanged",
    className:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  APPLICATION_DELETED: {
    resource: "APPLICATION",
    labelKey: "settings.auditLog.actionApplicationDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  INTERVIEW_SCHEDULED: {
    resource: "INTERVIEW",
    labelKey: "settings.auditLog.actionInterviewScheduled",
    className:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  INTERVIEW_UPDATED: {
    resource: "INTERVIEW",
    labelKey: "settings.auditLog.actionInterviewUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  INTERVIEW_CANCELED: {
    resource: "INTERVIEW",
    labelKey: "settings.auditLog.actionInterviewCanceled",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  SOURCING_LINK_CREATED: {
    resource: "SOURCING_LINK",
    labelKey: "settings.auditLog.actionSourcingLinkCreated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  SOURCING_LINK_UPDATED: {
    resource: "SOURCING_LINK",
    labelKey: "settings.auditLog.actionSourcingLinkUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  SOURCING_LINK_DELETED: {
    resource: "SOURCING_LINK",
    labelKey: "settings.auditLog.actionSourcingLinkDeleted",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
};

function formatJobStatusLabel(status: string, t: TranslateFn): string {
  const key = JOB_STATUS_I18N_MAP[status.toUpperCase()];
  if (!key) return status;
  const translated = t(key);
  return translated && translated !== key ? translated : status;
}

function formatStageLabel(stage: string, t: TranslateFn): string {
  const key = STAGE_I18N_MAP[stage.toUpperCase()];
  if (!key) return stage;
  const translated = t(key);
  return translated && translated !== key ? translated : stage;
}

/**
 * Resolves the workspace deep-link for active ATS entity audit records.
 */
export function getAuditEntityHref(
  log: Pick<OrganizationAuditLogRecord, "resource" | "action" | "targetId">,
): string | null {
  if (!log.targetId || DELETED_ENTITY_ACTIONS.has(log.action)) {
    return null;
  }
  switch (log.resource) {
    case "JOB":
      return `/jobs/${log.targetId}`;
    case "CANDIDATE":
      return `/candidates/${log.targetId}`;
    case "APPLICATION":
      return `/applications/${log.targetId}`;
    default:
      return null;
  }
}

function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, val] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(val));
  }
  return result;
}

/**
 * Returns filterable audit action options, narrowed by resource when provided.
 */
export function getAuditActionOptions(
  resource: string,
  t: TranslateFn,
): CustomSelectOption<string>[] {
  const normalizedResource = resource?.trim().toUpperCase();
  const options: CustomSelectOption<string>[] = [
    { value: "", label: t("settings.auditLog.filterAllActions") },
  ];

  for (const [action, meta] of Object.entries(ACTION_BADGE_CONFIG)) {
    if (normalizedResource && meta.resource !== normalizedResource) {
      continue;
    }
    options.push({
      value: action,
      label: t(meta.labelKey),
    });
  }

  return options;
}

/**
 * Returns all selectable resource filter options with localized labels.
 */
export function getAuditResourceOptions(
  t: TranslateFn,
): CustomSelectOption<string>[] {
  return [
    { value: "", label: t("settings.auditLog.filterAllResources") },
    ...Array.from(RESOURCE_KEYS).map((res) => ({
      value: res,
      label: t(`settings.auditLog.resources.${res}`),
    })),
  ];
}

/**
 * Resolves badge label and semantic badge styles for an organization audit action.
 */
export function getAuditActionBadge(action: string, t: TranslateFn) {
  const match = ACTION_BADGE_CONFIG[action];
  if (!match) {
    return {
      label: action,
      className: "bg-secondary text-secondary-foreground border-border",
    };
  }
  return {
    label: t(match.labelKey),
    className: match.className,
  };
}

/**
 * Resolves the localized label for an organization audit resource type.
 */
export function getAuditResourceLabel(resource: string, t: TranslateFn) {
  const normalized = resource?.trim().toUpperCase();
  const key = RESOURCE_KEYS.has(normalized) ? normalized : "OTHER";
  return t(`settings.auditLog.resources.${key}`);
}

/**
 * Resolves a human-readable field name for a diff table row, supporting both
 * standard field keys and RBAC permission strings (e.g. job:create).
 */
export function formatAuditFieldLabel(field: string, t: TranslateFn): string {
  if (field === "status") {
    return t("common.status");
  }
  if (KNOWN_FIELD_LABELS.has(field)) {
    const key = `settings.auditLog.fieldLabels.${field}`;
    const label = t(key);
    if (label && label !== key) return label;
  }
  if (field.includes(":")) {
    const permKey = field.replace(/:/g, "_");
    const fullKey = `settings.rolesMatrix.permissions.${permKey}`;
    const label = t(fullKey);
    if (label && label !== fullKey) return label;
  }
  return field;
}

/**
 * Formats a diff before/after value into a localized display string.
 */
export function formatAuditValue(
  field: string,
  value: unknown,
  t: TranslateFn,
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
    return interpolate(
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
    return interpolate(
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

function resolveTargetDisplay(
  log: OrganizationAuditLogRecord,
  t: TranslateFn,
): string {
  if (log.targetLabel?.trim()) return log.targetLabel.trim();
  const meta =
    log.metadata && typeof log.metadata === "object"
      ? (log.metadata as Record<string, unknown>)
      : null;
  if (meta) {
    for (const candidateKey of [
      "invitedEmail",
      "memberId",
      "role",
      "flowKey",
      "provider",
      "fileName",
      "newOwnerId",
    ]) {
      const val = meta[candidateKey];
      if (typeof val === "string" && val.trim()) {
        if (candidateKey === "role") {
          return val === "ALL"
            ? t("settings.auditLog.metadataLabels.allRoles")
            : getOrgRoleLabel(val, t);
        }
        return val.trim();
      }
    }
  }
  return log.targetId?.trim() || getAuditResourceLabel(log.resource, t);
}

/**
 * Generates a concise natural-language summary sentence for an audit event row.
 */
export function formatAuditSummary(
  log: OrganizationAuditLogRecord,
  t: TranslateFn,
): string {
  const meta =
    log.metadata && typeof log.metadata === "object"
      ? (log.metadata as Record<string, unknown>)
      : {};
  const target = resolveTargetDisplay(log, t);
  const roleChange = log.changes?.find((c) => c.field === "role");

  switch (log.action) {
    case "ORG_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryOrgUpdated", { target }),
        { target },
      );
    case "ORG_LOCALIZATION_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryOrgLocalization", {
          target,
        }),
        { target },
      );
    case "ORG_LOGO_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryOrgLogoUpdated", { target }),
        { target },
      );
    case "ORG_LOGO_REMOVED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryOrgLogoRemoved", { target }),
        { target },
      );
    case "ORG_AUDIT_RETENTION_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryOrgAuditRetentionUpdated", {
          target,
        }),
        { target },
      );
    case "OWNERSHIP_TRANSFERRED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryOwnershipTransferred", {
          target,
        }),
        { target },
      );
    case "MEMBER_ROLE_CHANGED": {
      const rawOld =
        (typeof roleChange?.before === "string" ? roleChange.before : null) ??
        (typeof meta.oldRole === "string" ? meta.oldRole : "");
      const rawNew =
        (typeof roleChange?.after === "string" ? roleChange.after : null) ??
        (typeof meta.newRole === "string" ? meta.newRole : "");
      const oldRole = rawOld ? getOrgRoleLabel(rawOld, t) : "—";
      const newRole = rawNew ? getOrgRoleLabel(rawNew, t) : "—";
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryMemberRoleChanged", {
          target,
          oldRole,
          newRole,
        }),
        { target, oldRole, newRole },
      );
    }
    case "MEMBER_REMOVED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryMemberRemoved", { target }),
        { target },
      );
    case "MEMBER_LEFT":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryMemberLeft", { target }),
        { target },
      );
    case "MEMBER_JOINED": {
      const rawRole = typeof meta.role === "string" ? meta.role : "MEMBER";
      const role = getOrgRoleLabel(rawRole, t);
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryMemberJoined", {
          target,
          role,
        }),
        { target, role },
      );
    }
    case "ROLE_PERMISSIONS_UPDATED": {
      const count =
        log.changes?.length ??
        (typeof meta.changesCount === "number"
          ? meta.changesCount
          : Array.isArray(meta.permissions)
            ? meta.permissions.length
            : typeof meta.changes === "number"
              ? meta.changes
              : 0);
      const roleTarget = getOrgRoleLabel(target, t);
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryRolePermissionsUpdated", {
          target: roleTarget,
          count,
        }),
        { target: roleTarget, count },
      );
    }
    case "ROLE_PERMISSIONS_RESET": {
      const roleTarget =
        target === "ALL"
          ? t("settings.auditLog.metadataLabels.allRoles")
          : getOrgRoleLabel(target, t);
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryRolePermissionsReset", {
          target: roleTarget,
        }),
        { target: roleTarget },
      );
    }
    case "INVITE_CREATED": {
      const rawRole = typeof meta.role === "string" ? meta.role : "MEMBER";
      const role = getOrgRoleLabel(rawRole, t);
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryInviteCreated", {
          target,
          role,
        }),
        { target, role },
      );
    }
    case "INVITE_RESENT":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryInviteResent", { target }),
        { target },
      );
    case "INVITE_REVOKED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryInviteRevoked", { target }),
        { target },
      );
    case "EMAIL_SETTINGS_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryEmailSettingsUpdated", {
          target,
        }),
        { target },
      );
    case "EMAIL_TEMPLATE_CREATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryEmailTemplateCreated", {
          target,
        }),
        { target },
      );
    case "EMAIL_TEMPLATE_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryEmailTemplateUpdated", {
          target,
        }),
        { target },
      );
    case "EMAIL_TEMPLATE_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryEmailTemplateDeleted", {
          target,
        }),
        { target },
      );
    case "EMAIL_FLOW_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryEmailFlowUpdated", {
          target,
        }),
        { target },
      );
    case "AI_SETTINGS_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryAiSettingsUpdated", {
          target,
        }),
        { target },
      );
    case "AI_SETTINGS_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryAiSettingsDeleted", {
          target,
        }),
        { target },
      );
    case "DOWNLOAD_DOCUMENT":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryDownloadDocument", {
          target,
        }),
        { target },
      );
    case "VIEW_PROFILE":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryViewProfile", {
          target,
        }),
        { target },
      );
    case "WEBHOOK_CREATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryWebhookCreated", { target }),
        { target },
      );
    case "WEBHOOK_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryWebhookUpdated", { target }),
        { target },
      );
    case "WEBHOOK_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryWebhookDeleted", { target }),
        { target },
      );
    case "JOB_CREATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryJobCreated", { target }),
        { target },
      );
    case "JOB_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryJobUpdated", { target }),
        { target },
      );
    case "JOB_STATUS_CHANGED": {
      const statusChange = log.changes?.find((c) => c.field === "status");
      const rawOld =
        (typeof statusChange?.before === "string"
          ? statusChange.before
          : null) ?? (typeof meta.oldStatus === "string" ? meta.oldStatus : "");
      const rawNew =
        (typeof statusChange?.after === "string" ? statusChange.after : null) ??
        (typeof meta.newStatus === "string" ? meta.newStatus : "");
      const oldStatus = rawOld ? formatJobStatusLabel(rawOld, t) : "—";
      const newStatus = rawNew ? formatJobStatusLabel(rawNew, t) : "—";
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryJobStatusChanged", {
          target,
          oldStatus,
          newStatus,
        }),
        { target, oldStatus, newStatus },
      );
    }
    case "JOB_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryJobDeleted", { target }),
        { target },
      );
    case "CANDIDATE_CREATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryCandidateCreated", {
          target,
        }),
        { target },
      );
    case "CANDIDATE_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryCandidateUpdated", {
          target,
        }),
        { target },
      );
    case "CANDIDATE_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryCandidateDeleted", {
          target,
        }),
        { target },
      );
    case "APPLICATION_CREATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryApplicationCreated", {
          target,
        }),
        { target },
      );
    case "APPLICATION_STAGE_CHANGED": {
      const stageChange = log.changes?.find((c) => c.field === "stage");
      const rawOld =
        (typeof stageChange?.before === "string" ? stageChange.before : null) ??
        (typeof meta.oldStage === "string" ? meta.oldStage : "");
      const rawNew =
        (typeof stageChange?.after === "string" ? stageChange.after : null) ??
        (typeof meta.newStage === "string" ? meta.newStage : "");
      const oldStage = rawOld ? formatStageLabel(rawOld, t) : "—";
      const newStage = rawNew ? formatStageLabel(rawNew, t) : "—";
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryApplicationStageChanged", {
          target,
          oldStage,
          newStage,
        }),
        { target, oldStage, newStage },
      );
    }
    case "APPLICATION_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryApplicationDeleted", {
          target,
        }),
        { target },
      );
    case "INTERVIEW_SCHEDULED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryInterviewScheduled", {
          target,
        }),
        { target },
      );
    case "INTERVIEW_UPDATED": {
      const key =
        meta.scorecardSubmitted === true &&
        (!log.changes || log.changes.length === 0)
          ? "settings.auditLog.metadataLabels.summaryInterviewScorecardSubmitted"
          : "settings.auditLog.metadataLabels.summaryInterviewUpdated";
      return interpolate(t(key, { target }), { target });
    }
    case "INTERVIEW_CANCELED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summaryInterviewCanceled", {
          target,
        }),
        { target },
      );
    case "SOURCING_LINK_CREATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summarySourcingLinkCreated", {
          target,
        }),
        { target },
      );
    case "SOURCING_LINK_UPDATED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summarySourcingLinkUpdated", {
          target,
        }),
        { target },
      );
    case "SOURCING_LINK_DELETED":
      return interpolate(
        t("settings.auditLog.metadataLabels.summarySourcingLinkDeleted", {
          target,
        }),
        { target },
      );
    default:
      return getAuditActionBadge(log.action, t).label;
  }
}

/**
 * Formats structured metadata lines for legacy organization audit logs without structured diffs.
 */
export function formatAuditMetadataLines(
  log: OrganizationAuditLogRecord,
  t: TranslateFn,
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
      interpolate(
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
      interpolate(
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
      interpolate(
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
        interpolate(
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
      interpolate(
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
