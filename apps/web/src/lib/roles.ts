import { Role, ROLE_LIST } from "@haihire/shared";
import type { CustomSelectOption } from "@/components/shared/custom-select";

type RoleTranslationKey =
  | "members.roleAdmin"
  | "members.roleRecruiter"
  | "members.roleHiringManager"
  | "members.roleInterviewer"
  | "members.roleMember";

const ROLE_LABEL_KEYS: Record<Role, RoleTranslationKey> = {
  [Role.ADMIN]: "members.roleAdmin",
  [Role.RECRUITER]: "members.roleRecruiter",
  [Role.HIRING_MANAGER]: "members.roleHiringManager",
  [Role.INTERVIEWER]: "members.roleInterviewer",
  [Role.MEMBER]: "members.roleMember",
};

type TranslateFn = (key: RoleTranslationKey) => string;

/**
 * Resolves a localized display label for an organization role value.
 */
export function getOrgRoleLabel(
  role: string | null | undefined,
  t: TranslateFn,
): string {
  const normalized = role?.trim().toUpperCase() as Role | undefined;
  if (normalized && normalized in ROLE_LABEL_KEYS) {
    return t(ROLE_LABEL_KEYS[normalized]);
  }
  return role || t("members.roleMember");
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
