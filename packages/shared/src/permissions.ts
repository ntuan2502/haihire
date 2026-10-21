/**
 * v0.4.0 sẽ thay nguồn đọc từ constant này → DB (bảng RolePermission).
 * Cấu trúc PERMISSIONS được thiết kế để migrate 1-1:
 * mỗi cặp (permission, role) → 1 row trong RolePermission.
 */

export const Role = {
  ADMIN: "ADMIN",
  RECRUITER: "RECRUITER",
  HIRING_MANAGER: "HIRING_MANAGER",
  INTERVIEWER: "INTERVIEWER",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export type Permission =
  // Organization Management
  | "org:view"
  | "org:update"
  | "org:delete"
  | "org:manage_members"
  | "org:manage_billing"
  // Job Requisition Management
  | "job:view"
  | "job:create"
  | "job:update"
  | "job:delete"
  // Candidate Profile Management
  | "candidate:view"
  | "candidate:view_basic"
  | "candidate:create"
  | "candidate:update"
  | "candidate:delete"
  | "candidate:document_upload"
  | "candidate:document_download"
  | "candidate:document_delete"
  // Application Pipeline Management
  | "application:view"
  | "application:create"
  | "application:update"
  | "application:update_stage"
  | "application:delete"
  | "application:document_upload"
  | "application:document_download"
  | "application:document_delete"
  // Interview Lifecycle Management
  | "interview:view"
  | "interview:create"
  | "interview:update"
  | "interview:delete"
  | "interview:scorecard_submit"
  // Candidate Sourcing & Attribution
  | "sourcing:view"
  | "sourcing:create"
  | "sourcing:update"
  | "sourcing:delete"
  // Recruitment Email Communication
  | "email:view"
  | "email:send"
  | "email:manage_templates"
  | "email:manage_settings"
  | "email:manage_system"
  // Settings & Integrations
  | "settings:manage_integrations";

export const PERMISSIONS: Record<Permission, Role[]> = {
  // Organization
  "org:view": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.MEMBER],
  "org:update": [Role.ADMIN],
  "org:delete": [Role.ADMIN],
  "org:manage_members": [Role.ADMIN],
  "org:manage_billing": [],

  // Jobs
  "job:view": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.MEMBER],
  "job:create": [Role.ADMIN, Role.RECRUITER],
  "job:update": [Role.ADMIN, Role.RECRUITER],
  "job:delete": [Role.ADMIN, Role.RECRUITER],

  // Candidates
  "candidate:view": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER],
  "candidate:view_basic": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.MEMBER],
  "candidate:create": [Role.ADMIN, Role.RECRUITER],
  "candidate:update": [Role.ADMIN, Role.RECRUITER],
  "candidate:delete": [Role.ADMIN, Role.RECRUITER],
  "candidate:document_upload": [Role.ADMIN, Role.RECRUITER],
  "candidate:document_download": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER],
  "candidate:document_delete": [Role.ADMIN, Role.RECRUITER],

  // Applications
  "application:view": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.MEMBER],
  "application:create": [Role.ADMIN, Role.RECRUITER],
  "application:update": [Role.ADMIN, Role.RECRUITER],
  "application:update_stage": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER],
  "application:delete": [Role.ADMIN, Role.RECRUITER],
  "application:document_upload": [Role.ADMIN, Role.RECRUITER],
  "application:document_download": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER],
  "application:document_delete": [Role.ADMIN, Role.RECRUITER],

  // Interviews
  "interview:view": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER, Role.MEMBER],
  "interview:create": [Role.ADMIN, Role.RECRUITER],
  "interview:update": [Role.ADMIN, Role.RECRUITER],
  "interview:delete": [Role.ADMIN, Role.RECRUITER],
  "interview:scorecard_submit": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.INTERVIEWER],

  // Sourcing
  "sourcing:view": [Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER, Role.MEMBER],
  "sourcing:create": [Role.ADMIN, Role.RECRUITER],
  "sourcing:update": [Role.ADMIN, Role.RECRUITER],
  "sourcing:delete": [Role.ADMIN, Role.RECRUITER],

  // Email
  "email:view": [Role.ADMIN, Role.RECRUITER],
  "email:send": [Role.ADMIN, Role.RECRUITER],
  "email:manage_templates": [Role.ADMIN],
  "email:manage_settings": [Role.ADMIN],
  "email:manage_system": [Role.ADMIN],

  // Settings & Integrations
  "settings:manage_integrations": [Role.ADMIN],
};

/**
 * Checks whether a given role is granted a specific permission.
 * Organization owner (resolved dynamically via isOwner) always bypasses all checks with full privileges.
 */
export function hasPermission(
  role: Role | string,
  permission: Permission,
  isOwner?: boolean,
): boolean {
  if (isOwner) {
    return true;
  }
  const allowed = PERMISSIONS[permission];
  return Boolean(allowed && allowed.includes(role as Role));
}
