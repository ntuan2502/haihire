import {
  AUDIT_ACTION_REGISTRY,
  AUDIT_RESOURCE_REGISTRY,
  DELETED_ENTITY_AUDIT_ACTIONS,
  getAuditActionMeta,
  inferAuditVerb,
  type AuditResource,
  type AuditVerb,
} from "@haihire/shared";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { getOrgRoleLabel } from "@/lib/roles";
import type { CustomSelectOption } from "@/components/shared";
import {
  formatAuditMetadataLines,
  formatAuditValue,
  formatJobStatusLabel,
  formatStageLabel,
  interpolateAuditText,
  parseUserAgent,
  type AuditTranslateFn,
} from "./audit-log-value-formatters";

export type TranslateFn = AuditTranslateFn;
export { formatAuditMetadataLines, formatAuditValue, parseUserAgent };

const VERB_BADGE_STYLES: Record<AuditVerb, string> = {
  CREATE:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  UPDATE:
    "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  DELETE:
    "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  STATE:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  SECURITY:
    "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  VIEW: "bg-slate-100 dark:bg-slate-900/40 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

/**
 * Converts camelCase, snake_case, or SCREAMING_SNAKE identifiers into readable text
 * so newly introduced DB columns or unregistered audit actions degrade gracefully.
 */
function humanizeAuditToken(raw: string): string {
  const spaced = raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!spaced) return raw;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Resolves the workspace deep-link for active ATS entity audit records from AUDIT_RESOURCE_REGISTRY.
 */
export function getAuditEntityHref(
  log: Pick<OrganizationAuditLogRecord, "resource" | "action" | "targetId">,
): string | null {
  if (
    !log.targetId ||
    DELETED_ENTITY_AUDIT_ACTIONS.has(log.action) ||
    inferAuditVerb(log.action) === "DELETE"
  ) {
    return null;
  }
  const meta =
    AUDIT_RESOURCE_REGISTRY[log.resource as AuditResource] ?? undefined;
  return meta?.hrefPrefix ? `${meta.hrefPrefix}/${log.targetId}` : null;
}

/**
 * Returns filterable audit action options driven directly by AUDIT_ACTION_REGISTRY.
 */
export function getAuditActionOptions(
  resource: string,
  t: TranslateFn,
): CustomSelectOption<string>[] {
  const normalizedResource = resource?.trim().toUpperCase();
  const options: CustomSelectOption<string>[] = [
    { value: "", label: t("settings.auditLog.filterAllActions") },
  ];

  for (const [action, meta] of Object.entries(AUDIT_ACTION_REGISTRY)) {
    if (normalizedResource && meta.resource !== normalizedResource) {
      continue;
    }
    options.push({
      value: action,
      label: getAuditActionBadge(action, t).label,
    });
  }

  return options;
}

/**
 * Returns all selectable resource filter options driven directly by AUDIT_RESOURCE_REGISTRY.
 */
export function getAuditResourceOptions(
  t: TranslateFn,
): CustomSelectOption<string>[] {
  return [
    { value: "", label: t("settings.auditLog.filterAllResources") },
    ...Object.keys(AUDIT_RESOURCE_REGISTRY).map((res) => ({
      value: res,
      label: getAuditResourceLabel(res, t),
    })),
  ];
}

/**
 * Resolves the localized label for an organization audit resource type.
 */
export function getAuditResourceLabel(resource: string, t: TranslateFn) {
  const normalized = resource?.trim().toUpperCase();
  const key = normalized in AUDIT_RESOURCE_REGISTRY ? normalized : "OTHER";
  return t(`settings.auditLog.resources.${key}`);
}

/**
 * Resolves badge label and semantic badge styles for an organization audit action.
 */
export function getAuditActionBadge(action: string, t: TranslateFn) {
  const meta = getAuditActionMeta(action);
  const verb = meta?.tone ?? meta?.verb ?? inferAuditVerb(action);
  const className = VERB_BADGE_STYLES[verb];

  const actionKey = `settings.auditLog.actions.${action}`;
  const translated = t(actionKey);
  if (translated && translated !== actionKey) {
    return { label: translated, className };
  }

  if (meta) {
    const resourceLabel = getAuditResourceLabel(meta.resource, t);
    const verbKey = `settings.auditLog.verbLabels.${meta.verb}`;
    const verbLabel = t(verbKey, { resource: resourceLabel });
    if (verbLabel && verbLabel !== verbKey) {
      return {
        label: interpolateAuditText(verbLabel, { resource: resourceLabel }),
        className,
      };
    }
  }

  return {
    label: humanizeAuditToken(action),
    className,
  };
}

/**
 * Resolves a human-readable field name for a diff table row, supporting localized overrides,
 * RBAC permission strings (e.g. job:create), and camelCase auto-humanization fallback.
 */
export function formatAuditFieldLabel(field: string, t: TranslateFn): string {
  if (field === "status") {
    return t("common.status");
  }
  const key = `settings.auditLog.fieldLabels.${field}`;
  const label = t(key);
  if (label && label !== key) {
    return label;
  }
  if (field.includes(":")) {
    const permKey = field.replace(/:/g, "_");
    const fullKey = `settings.rolesMatrix.permissions.${permKey}`;
    const permLabel = t(fullKey);
    if (permLabel && permLabel !== fullKey) return permLabel;
  }
  return humanizeAuditToken(field);
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
 * Generates a concise natural-language summary sentence for an audit event row,
 * handling specialized transitions explicitly and deriving standard CRUD summaries by verb.
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

  switch (log.action) {
    case "MEMBER_ROLE_CHANGED": {
      const roleChange = log.changes?.find((c) => c.field === "role");
      const rawOld =
        (typeof roleChange?.before === "string" ? roleChange.before : null) ??
        (typeof meta.oldRole === "string" ? meta.oldRole : "");
      const rawNew =
        (typeof roleChange?.after === "string" ? roleChange.after : null) ??
        (typeof meta.newRole === "string" ? meta.newRole : "");
      const oldRole = rawOld ? getOrgRoleLabel(rawOld, t) : "—";
      const newRole = rawNew ? getOrgRoleLabel(rawNew, t) : "—";
      return interpolateAuditText(
        t("settings.auditLog.metadataLabels.summaryMemberRoleChanged", {
          target,
          oldRole,
          newRole,
        }),
        { target, oldRole, newRole },
      );
    }
    case "MEMBER_JOINED": {
      const rawRole = typeof meta.role === "string" ? meta.role : "MEMBER";
      const role = getOrgRoleLabel(rawRole, t);
      return interpolateAuditText(
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
      return interpolateAuditText(
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
      return interpolateAuditText(
        t("settings.auditLog.metadataLabels.summaryRolePermissionsReset", {
          target: roleTarget,
        }),
        { target: roleTarget },
      );
    }
    case "INVITE_CREATED": {
      const rawRole = typeof meta.role === "string" ? meta.role : "MEMBER";
      const role = getOrgRoleLabel(rawRole, t);
      return interpolateAuditText(
        t("settings.auditLog.metadataLabels.summaryInviteCreated", {
          target,
          role,
        }),
        { target, role },
      );
    }
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
      return interpolateAuditText(
        t("settings.auditLog.metadataLabels.summaryJobStatusChanged", {
          target,
          oldStatus,
          newStatus,
        }),
        { target, oldStatus, newStatus },
      );
    }
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
      return interpolateAuditText(
        t("settings.auditLog.metadataLabels.summaryApplicationStageChanged", {
          target,
          oldStage,
          newStage,
        }),
        { target, oldStage, newStage },
      );
    }
    case "INTERVIEW_UPDATED": {
      if (
        meta.scorecardSubmitted === true &&
        (!log.changes || log.changes.length === 0)
      ) {
        return interpolateAuditText(
          t(
            "settings.auditLog.metadataLabels.summaryInterviewScorecardSubmitted",
            { target },
          ),
          { target },
        );
      }
      break;
    }
  }

  const actionMeta = getAuditActionMeta(log.action);
  const verb = actionMeta?.verb ?? inferAuditVerb(log.action);
  const resourceLabel = getAuditResourceLabel(
    actionMeta?.resource ?? log.resource,
    t,
  );
  const summaryKey = `settings.auditLog.verbSummaries.${verb}`;
  const template = t(summaryKey, { resource: resourceLabel, target });
  if (template && template !== summaryKey) {
    return interpolateAuditText(template, { resource: resourceLabel, target });
  }
  return `${getAuditActionBadge(log.action, t).label}: ${target}`;
}
