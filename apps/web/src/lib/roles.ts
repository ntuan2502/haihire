import { Role, ROLE_LIST, type Permission } from "@haihire/shared";
import type { CustomSelectOption } from "@/components/shared/custom-select";

export type OrgDisplayRole = Role | "OWNER";

type RoleTranslationKey =
  | "members.roleOwner"
  | "members.roleAdmin"
  | "members.roleRecruiter"
  | "members.roleHiringManager"
  | "members.roleInterviewer"
  | "members.roleMember";

const ROLE_LABEL_KEYS: Record<OrgDisplayRole, RoleTranslationKey> = {
  OWNER: "members.roleOwner",
  [Role.ADMIN]: "members.roleAdmin",
  [Role.RECRUITER]: "members.roleRecruiter",
  [Role.HIRING_MANAGER]: "members.roleHiringManager",
  [Role.INTERVIEWER]: "members.roleInterviewer",
  [Role.MEMBER]: "members.roleMember",
};

const ROLE_BADGE_CLASSES: Record<OrgDisplayRole, string> = {
  OWNER:
    "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  [Role.ADMIN]:
    "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
  [Role.RECRUITER]:
    "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  [Role.HIRING_MANAGER]:
    "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  [Role.INTERVIEWER]:
    "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  [Role.MEMBER]:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const PERMISSION_LABEL_KEYS: Record<Permission, string> = {
  "org:view": "settings.rolesMatrix.permissions.org_view",
  "org:update": "settings.rolesMatrix.permissions.org_update",
  "org:delete": "settings.rolesMatrix.permissions.org_delete",
  "org:manage_members": "settings.rolesMatrix.permissions.org_manage_members",
  "org:manage_roles": "settings.rolesMatrix.permissions.org_manage_roles",
  "org:manage_billing": "settings.rolesMatrix.permissions.org_manage_billing",
  "org:transfer_ownership":
    "settings.rolesMatrix.permissions.org_transfer_ownership",
  "org:view_audit_log": "settings.rolesMatrix.permissions.org_view_audit_log",
  "job:view": "settings.rolesMatrix.permissions.job_view",
  "job:create": "settings.rolesMatrix.permissions.job_create",
  "job:update": "settings.rolesMatrix.permissions.job_update",
  "job:delete": "settings.rolesMatrix.permissions.job_delete",
  "candidate:view": "settings.rolesMatrix.permissions.candidate_view",
  "candidate:create": "settings.rolesMatrix.permissions.candidate_create",
  "candidate:update": "settings.rolesMatrix.permissions.candidate_update",
  "candidate:delete": "settings.rolesMatrix.permissions.candidate_delete",
  "candidate:document_upload":
    "settings.rolesMatrix.permissions.candidate_document_upload",
  "candidate:document_download":
    "settings.rolesMatrix.permissions.candidate_document_download",
  "candidate:document_delete":
    "settings.rolesMatrix.permissions.candidate_document_delete",
  "application:view": "settings.rolesMatrix.permissions.application_view",
  "application:create": "settings.rolesMatrix.permissions.application_create",
  "application:update": "settings.rolesMatrix.permissions.application_update",
  "application:update_stage":
    "settings.rolesMatrix.permissions.application_update_stage",
  "application:delete": "settings.rolesMatrix.permissions.application_delete",
  "application:document_upload":
    "settings.rolesMatrix.permissions.application_document_upload",
  "application:document_download":
    "settings.rolesMatrix.permissions.application_document_download",
  "application:document_delete":
    "settings.rolesMatrix.permissions.application_document_delete",
  "interview:view": "settings.rolesMatrix.permissions.interview_view",
  "interview:create": "settings.rolesMatrix.permissions.interview_create",
  "interview:update": "settings.rolesMatrix.permissions.interview_update",
  "interview:delete": "settings.rolesMatrix.permissions.interview_delete",
  "interview:scorecard_submit":
    "settings.rolesMatrix.permissions.interview_scorecard_submit",
  "sourcing:view": "settings.rolesMatrix.permissions.sourcing_view",
  "sourcing:create": "settings.rolesMatrix.permissions.sourcing_create",
  "sourcing:update": "settings.rolesMatrix.permissions.sourcing_update",
  "sourcing:delete": "settings.rolesMatrix.permissions.sourcing_delete",
  "email:view": "settings.rolesMatrix.permissions.email_view",
  "email:send": "settings.rolesMatrix.permissions.email_send",
  "email:manage_templates":
    "settings.rolesMatrix.permissions.email_manage_templates",
  "email:manage_settings":
    "settings.rolesMatrix.permissions.email_manage_settings",
  "settings:manage_integrations":
    "settings.rolesMatrix.permissions.settings_manage_integrations",
};

const DOC_TYPE_LABEL_KEYS: Record<string, string> = {
  RESUME: "common.docTypes.resume",
  COVER_LETTER: "common.docTypes.coverLetter",
  OTHER: "common.docTypes.other",
};

type TranslateFn = (key: string) => string;

/**
 * Resolves a localized display label for an organization role value.
 */
export function getOrgRoleLabel(
  role: string | null | undefined,
  t: TranslateFn,
): string {
  const normalized = role?.trim().toUpperCase() as OrgDisplayRole | undefined;
  if (normalized && normalized in ROLE_LABEL_KEYS) {
    return t(ROLE_LABEL_KEYS[normalized]);
  }
  return role || t("members.roleMember");
}

/**
 * Returns Tailwind badge styling classes for an organization role pill.
 */
export function getOrgRoleBadgeClass(role: string | null | undefined): string {
  const normalized = role?.trim().toUpperCase() as OrgDisplayRole | undefined;
  if (normalized && normalized in ROLE_BADGE_CLASSES) {
    return ROLE_BADGE_CLASSES[normalized];
  }
  return ROLE_BADGE_CLASSES[Role.MEMBER];
}

/**
 * Builds dropdown options for all current organization roles.
 */
export function getOrgRoleOptions(
  t: TranslateFn,
  options?: { excludeAdmin?: boolean },
): CustomSelectOption<Role>[] {
  return ROLE_LIST.filter(
    (role) => !(options?.excludeAdmin && role === Role.ADMIN),
  ).map((role) => ({
    value: role,
    label: t(ROLE_LABEL_KEYS[role]),
  }));
}

/**
 * Resolves a localized display label for an RBAC permission key.
 */
export function getPermissionLabel(
  permission: Permission,
  t: TranslateFn,
): string {
  const key = PERMISSION_LABEL_KEYS[permission];
  const translated = t(key);
  return translated && translated !== key ? translated : permission;
}

/**
 * Resolves a localized display label for a candidate/application document type.
 */
export function getDocumentTypeLabel(
  docType: string | null | undefined,
  t: TranslateFn,
): string {
  if (!docType) {
    return t("common.docTypes.resume");
  }
  const normalized = docType
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const key = DOC_TYPE_LABEL_KEYS[normalized];
  if (key) {
    const translated = t(key);
    return translated && translated !== key ? translated : docType;
  }
  return docType;
}
