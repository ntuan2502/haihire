import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";
import { getOrgRoleLabel } from "@/lib/roles";

const RESOURCE_KEYS = new Set([
  "ORGANIZATION",
  "MEMBER",
  "ROLE_PERMISSIONS",
  "SYSTEM",
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

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

const ACTION_BADGE_CONFIG: Record<
  string,
  { labelKey: string; className: string }
> = {
  ROLE_PERMISSIONS_UPDATED: {
    labelKey: "settings.auditLog.actionRolePermissionsUpdated",
    className:
      "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  ROLE_PERMISSIONS_RESET: {
    labelKey: "settings.auditLog.actionRolePermissionsReset",
    className:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  MEMBER_ROLE_CHANGED: {
    labelKey: "settings.auditLog.actionMemberRoleChanged",
    className:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  MEMBER_REMOVED: {
    labelKey: "settings.auditLog.actionMemberRemoved",
    className:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  MEMBER_LEFT: {
    labelKey: "settings.auditLog.actionMemberLeft",
    className:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  OWNERSHIP_TRANSFERRED: {
    labelKey: "settings.auditLog.actionOwnershipTransferred",
    className:
      "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  ORG_DELETED: {
    labelKey: "settings.auditLog.actionOrgDeleted",
    className:
      "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  ORG_LOCALIZATION_UPDATED: {
    labelKey: "settings.auditLog.actionOrgLocalizationUpdated",
    className:
      "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  ORG_LOGO_UPDATED: {
    labelKey: "settings.auditLog.actionOrgLogoUpdated",
    className:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  ORG_LOGO_REMOVED: {
    labelKey: "settings.auditLog.actionOrgLogoRemoved",
    className:
      "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
};

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
 * Formats structured metadata lines for an expanded organization audit log row.
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
      t("settings.auditLog.metadataLabels.roleTarget", {
        role: roleLabel,
      }).replace("{role}", roleLabel),
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
      t("settings.auditLog.metadataLabels.permissionsUpdated", {
        count: permCount,
      }).replace("{count}", String(permCount)),
    );
  }

  if (
    typeof record.oldRole === "string" &&
    typeof record.newRole === "string"
  ) {
    const oldRoleLabel = getOrgRoleLabel(record.oldRole, t);
    const newRoleLabel = getOrgRoleLabel(record.newRole, t);
    lines.push(
      t("settings.auditLog.metadataLabels.roleChanged", {
        oldRole: oldRoleLabel,
        newRole: newRoleLabel,
      })
        .replace("{oldRole}", oldRoleLabel)
        .replace("{newRole}", newRoleLabel),
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
        t("settings.auditLog.metadataLabels.localizationUpdated", {
          fields: joined,
        }).replace("{fields}", joined),
      );
    }
  }

  if (
    log.action === "ORG_LOGO_UPDATED" &&
    typeof record.fileName === "string"
  ) {
    lines.push(
      t("settings.auditLog.metadataLabels.logoUpdated", {
        fileName: record.fileName,
      }).replace("{fileName}", record.fileName),
    );
  }

  if (log.action === "ORG_LOGO_REMOVED") {
    lines.push(t("settings.auditLog.metadataLabels.logoRemoved"));
  }

  return lines;
}
