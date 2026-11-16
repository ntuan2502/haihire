import { Role, type Permission } from "@haihire/shared";

export const ROLES: Array<{
  role: Role;
  labelKey:
    | "roleAdmin"
    | "roleRecruiter"
    | "roleHiringManager"
    | "roleInterviewer"
    | "roleMember";
}> = [
  { role: Role.ADMIN, labelKey: "roleAdmin" },
  { role: Role.RECRUITER, labelKey: "roleRecruiter" },
  { role: Role.HIRING_MANAGER, labelKey: "roleHiringManager" },
  { role: Role.INTERVIEWER, labelKey: "roleInterviewer" },
  { role: Role.MEMBER, labelKey: "roleMember" },
];

export interface PermissionCategory {
  categoryKey:
    | "categoryOrg"
    | "categoryJob"
    | "categoryCandidate"
    | "categoryApplication"
    | "categoryInterview"
    | "categorySourcing"
    | "categoryEmail"
    | "categorySettings";
  permissions: Permission[];
}

export const CATEGORIES: PermissionCategory[] = [
  {
    categoryKey: "categoryOrg",
    permissions: [
      "org:view",
      "org:update",
      "org:delete",
      "org:manage_members",
      "org:manage_roles",
      "org:manage_billing",
      "org:transfer_ownership",
      "org:view_audit_log",
    ],
  },
  {
    categoryKey: "categoryJob",
    permissions: ["job:view", "job:create", "job:update", "job:delete"],
  },
  {
    categoryKey: "categoryCandidate",
    permissions: [
      "candidate:view",
      "candidate:create",
      "candidate:update",
      "candidate:delete",
      "candidate:document_upload",
      "candidate:document_download",
      "candidate:document_delete",
    ],
  },
  {
    categoryKey: "categoryApplication",
    permissions: [
      "application:view",
      "application:create",
      "application:update",
      "application:update_stage",
      "application:delete",
      "application:document_upload",
      "application:document_download",
      "application:document_delete",
    ],
  },
  {
    categoryKey: "categoryInterview",
    permissions: [
      "interview:view",
      "interview:create",
      "interview:update",
      "interview:delete",
      "interview:scorecard_submit",
    ],
  },
  {
    categoryKey: "categorySourcing",
    permissions: [
      "sourcing:view",
      "sourcing:create",
      "sourcing:update",
      "sourcing:delete",
    ],
  },
  {
    categoryKey: "categoryEmail",
    permissions: [
      "email:view",
      "email:send",
      "email:manage_templates",
      "email:manage_settings",
    ],
  },
  {
    categoryKey: "categorySettings",
    permissions: ["settings:manage_integrations"],
  },
];
