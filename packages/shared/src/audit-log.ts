import { z } from "zod";

export interface AuditChangeEntry {
  field: string;
  before: unknown;
  after: unknown;
}

export interface AuditLogEnvelopeInput {
  targetId?: string | null;
  targetLabel?: string | null;
  changes?: AuditChangeEntry[] | null;
  actorNameSnapshot?: string | null;
  actorEmailSnapshot?: string | null;
}

export const AUDIT_RESOURCES = {
  ORGANIZATION: "ORGANIZATION",
  MEMBER: "MEMBER",
  INVITATION: "INVITATION",
  ROLE_PERMISSIONS: "ROLE_PERMISSIONS",
  EMAIL: "EMAIL",
  WEBHOOK: "WEBHOOK",
  AI: "AI",
  JOB: "JOB",
  CANDIDATE: "CANDIDATE",
  APPLICATION: "APPLICATION",
  INTERVIEW: "INTERVIEW",
  SOURCING_LINK: "SOURCING_LINK",
  SYSTEM: "SYSTEM",
} as const;

export type AuditResource =
  (typeof AUDIT_RESOURCES)[keyof typeof AUDIT_RESOURCES];

export type AuditVerb =
  "CREATE" | "UPDATE" | "DELETE" | "STATE" | "SECURITY" | "VIEW";

export interface AuditResourceMeta {
  hrefPrefix?: string;
}

export const AUDIT_RESOURCE_REGISTRY: Record<AuditResource, AuditResourceMeta> =
  {
    ORGANIZATION: {},
    MEMBER: {},
    INVITATION: {},
    ROLE_PERMISSIONS: {},
    EMAIL: {},
    WEBHOOK: {},
    AI: {},
    JOB: { hrefPrefix: "/jobs" },
    CANDIDATE: { hrefPrefix: "/candidates" },
    APPLICATION: { hrefPrefix: "/applications" },
    INTERVIEW: {},
    SOURCING_LINK: {},
    SYSTEM: {},
  };

export const AUDIT_ACTIONS = {
  ROLE_PERMISSIONS_UPDATED: "ROLE_PERMISSIONS_UPDATED",
  ROLE_PERMISSIONS_RESET: "ROLE_PERMISSIONS_RESET",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  MEMBER_LEFT: "MEMBER_LEFT",
  MEMBER_JOINED: "MEMBER_JOINED",
  OWNERSHIP_TRANSFERRED: "OWNERSHIP_TRANSFERRED",
  ORG_UPDATED: "ORG_UPDATED",
  ORG_DELETED: "ORG_DELETED",
  ORG_LOCALIZATION_UPDATED: "ORG_LOCALIZATION_UPDATED",
  ORG_LOGO_UPDATED: "ORG_LOGO_UPDATED",
  ORG_LOGO_REMOVED: "ORG_LOGO_REMOVED",
  INVITE_CREATED: "INVITE_CREATED",
  INVITE_RESENT: "INVITE_RESENT",
  INVITE_REVOKED: "INVITE_REVOKED",
  EMAIL_SETTINGS_UPDATED: "EMAIL_SETTINGS_UPDATED",
  EMAIL_TEMPLATE_CREATED: "EMAIL_TEMPLATE_CREATED",
  EMAIL_TEMPLATE_UPDATED: "EMAIL_TEMPLATE_UPDATED",
  EMAIL_TEMPLATE_DELETED: "EMAIL_TEMPLATE_DELETED",
  EMAIL_FLOW_UPDATED: "EMAIL_FLOW_UPDATED",
  WEBHOOK_CREATED: "WEBHOOK_CREATED",
  WEBHOOK_UPDATED: "WEBHOOK_UPDATED",
  WEBHOOK_DELETED: "WEBHOOK_DELETED",
  AI_POLICY_UPDATED: "AI_POLICY_UPDATED",
  AI_CONNECTION_CREATED: "AI_CONNECTION_CREATED",
  AI_CONNECTION_UPDATED: "AI_CONNECTION_UPDATED",
  AI_CONNECTION_DELETED: "AI_CONNECTION_DELETED",
  AI_ROUTES_UPDATED: "AI_ROUTES_UPDATED",
  AI_SETTINGS_UPDATED: "AI_SETTINGS_UPDATED",
  AI_SETTINGS_DELETED: "AI_SETTINGS_DELETED",
  JOB_CREATED: "JOB_CREATED",
  JOB_UPDATED: "JOB_UPDATED",
  JOB_STATUS_CHANGED: "JOB_STATUS_CHANGED",
  JOB_DELETED: "JOB_DELETED",
  CANDIDATE_CREATED: "CANDIDATE_CREATED",
  CANDIDATE_UPDATED: "CANDIDATE_UPDATED",
  CANDIDATE_DELETED: "CANDIDATE_DELETED",
  APPLICATION_CREATED: "APPLICATION_CREATED",
  APPLICATION_STAGE_CHANGED: "APPLICATION_STAGE_CHANGED",
  APPLICATION_DELETED: "APPLICATION_DELETED",
  INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
  INTERVIEW_UPDATED: "INTERVIEW_UPDATED",
  INTERVIEW_CANCELED: "INTERVIEW_CANCELED",
  SOURCING_LINK_CREATED: "SOURCING_LINK_CREATED",
  SOURCING_LINK_UPDATED: "SOURCING_LINK_UPDATED",
  SOURCING_LINK_DELETED: "SOURCING_LINK_DELETED",
  ORG_AUDIT_RETENTION_UPDATED: "ORG_AUDIT_RETENTION_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditActionMeta {
  resource: AuditResource;
  verb: AuditVerb;
  sensitive?: boolean;
  tone?: AuditVerb;
}

export const AUDIT_ACTION_REGISTRY: Record<string, AuditActionMeta> = {
  // Roles & Members
  ROLE_PERMISSIONS_UPDATED: {
    resource: AUDIT_RESOURCES.ROLE_PERMISSIONS,
    verb: "SECURITY",
    tone: "UPDATE",
    sensitive: true,
  },
  ROLE_PERMISSIONS_RESET: {
    resource: AUDIT_RESOURCES.ROLE_PERMISSIONS,
    verb: "STATE",
    sensitive: true,
  },
  MEMBER_ROLE_CHANGED: {
    resource: AUDIT_RESOURCES.MEMBER,
    verb: "STATE",
  },
  MEMBER_JOINED: {
    resource: AUDIT_RESOURCES.MEMBER,
    verb: "CREATE",
  },
  MEMBER_REMOVED: {
    resource: AUDIT_RESOURCES.MEMBER,
    verb: "DELETE",
    sensitive: true,
  },
  MEMBER_LEFT: {
    resource: AUDIT_RESOURCES.MEMBER,
    verb: "DELETE",
    tone: "STATE",
  },
  OWNERSHIP_TRANSFERRED: {
    resource: AUDIT_RESOURCES.ORGANIZATION,
    verb: "SECURITY",
    sensitive: true,
  },

  // Organization Settings
  ORG_UPDATED: { resource: AUDIT_RESOURCES.ORGANIZATION, verb: "UPDATE" },
  ORG_DELETED: {
    resource: AUDIT_RESOURCES.ORGANIZATION,
    verb: "DELETE",
    sensitive: true,
  },
  ORG_LOCALIZATION_UPDATED: {
    resource: AUDIT_RESOURCES.ORGANIZATION,
    verb: "UPDATE",
  },
  ORG_LOGO_UPDATED: { resource: AUDIT_RESOURCES.ORGANIZATION, verb: "UPDATE" },
  ORG_LOGO_REMOVED: {
    resource: AUDIT_RESOURCES.ORGANIZATION,
    verb: "UPDATE",
    tone: "DELETE",
  },
  ORG_AUDIT_RETENTION_UPDATED: {
    resource: AUDIT_RESOURCES.ORGANIZATION,
    verb: "SECURITY",
    sensitive: true,
  },

  // Invitations
  INVITE_CREATED: { resource: AUDIT_RESOURCES.INVITATION, verb: "CREATE" },
  INVITE_RESENT: { resource: AUDIT_RESOURCES.INVITATION, verb: "STATE" },
  INVITE_REVOKED: { resource: AUDIT_RESOURCES.INVITATION, verb: "DELETE" },

  // Email Configuration
  EMAIL_SETTINGS_UPDATED: {
    resource: AUDIT_RESOURCES.EMAIL,
    verb: "SECURITY",
    sensitive: true,
  },
  EMAIL_TEMPLATE_CREATED: { resource: AUDIT_RESOURCES.EMAIL, verb: "CREATE" },
  EMAIL_TEMPLATE_UPDATED: { resource: AUDIT_RESOURCES.EMAIL, verb: "UPDATE" },
  EMAIL_TEMPLATE_DELETED: { resource: AUDIT_RESOURCES.EMAIL, verb: "DELETE" },
  EMAIL_FLOW_UPDATED: { resource: AUDIT_RESOURCES.EMAIL, verb: "UPDATE" },

  // Webhooks
  WEBHOOK_CREATED: { resource: AUDIT_RESOURCES.WEBHOOK, verb: "CREATE" },
  WEBHOOK_UPDATED: { resource: AUDIT_RESOURCES.WEBHOOK, verb: "UPDATE" },
  WEBHOOK_DELETED: {
    resource: AUDIT_RESOURCES.WEBHOOK,
    verb: "DELETE",
    sensitive: true,
  },

  // AI Connections & Proxy Routing (plus legacy AI_SETTINGS_* compatibility)
  AI_POLICY_UPDATED: {
    resource: AUDIT_RESOURCES.AI,
    verb: "SECURITY",
    sensitive: true,
  },
  AI_CONNECTION_CREATED: { resource: AUDIT_RESOURCES.AI, verb: "CREATE" },
  AI_CONNECTION_UPDATED: { resource: AUDIT_RESOURCES.AI, verb: "UPDATE" },
  AI_CONNECTION_DELETED: {
    resource: AUDIT_RESOURCES.AI,
    verb: "DELETE",
    sensitive: true,
  },
  AI_ROUTES_UPDATED: { resource: AUDIT_RESOURCES.AI, verb: "UPDATE" },
  AI_SETTINGS_UPDATED: { resource: AUDIT_RESOURCES.AI, verb: "UPDATE" },
  AI_SETTINGS_DELETED: {
    resource: AUDIT_RESOURCES.AI,
    verb: "DELETE",
    sensitive: true,
  },

  // Jobs
  JOB_CREATED: { resource: AUDIT_RESOURCES.JOB, verb: "CREATE" },
  JOB_UPDATED: { resource: AUDIT_RESOURCES.JOB, verb: "UPDATE" },
  JOB_STATUS_CHANGED: { resource: AUDIT_RESOURCES.JOB, verb: "STATE" },
  JOB_DELETED: {
    resource: AUDIT_RESOURCES.JOB,
    verb: "DELETE",
    sensitive: true,
  },

  // Candidates & Documents
  CANDIDATE_CREATED: { resource: AUDIT_RESOURCES.CANDIDATE, verb: "CREATE" },
  CANDIDATE_UPDATED: { resource: AUDIT_RESOURCES.CANDIDATE, verb: "UPDATE" },
  CANDIDATE_DELETED: {
    resource: AUDIT_RESOURCES.CANDIDATE,
    verb: "DELETE",
    sensitive: true,
  },
  DOWNLOAD_DOCUMENT: { resource: AUDIT_RESOURCES.CANDIDATE, verb: "VIEW" },
  VIEW_PROFILE: { resource: AUDIT_RESOURCES.CANDIDATE, verb: "VIEW" },

  // Applications
  APPLICATION_CREATED: {
    resource: AUDIT_RESOURCES.APPLICATION,
    verb: "CREATE",
  },
  APPLICATION_STAGE_CHANGED: {
    resource: AUDIT_RESOURCES.APPLICATION,
    verb: "STATE",
  },
  APPLICATION_DELETED: {
    resource: AUDIT_RESOURCES.APPLICATION,
    verb: "DELETE",
    sensitive: true,
  },

  // Interviews
  INTERVIEW_SCHEDULED: { resource: AUDIT_RESOURCES.INTERVIEW, verb: "CREATE" },
  INTERVIEW_UPDATED: { resource: AUDIT_RESOURCES.INTERVIEW, verb: "UPDATE" },
  INTERVIEW_CANCELED: { resource: AUDIT_RESOURCES.INTERVIEW, verb: "DELETE" },

  // Sourcing Tracking Links
  SOURCING_LINK_CREATED: {
    resource: AUDIT_RESOURCES.SOURCING_LINK,
    verb: "CREATE",
  },
  SOURCING_LINK_UPDATED: {
    resource: AUDIT_RESOURCES.SOURCING_LINK,
    verb: "UPDATE",
  },
  SOURCING_LINK_DELETED: {
    resource: AUDIT_RESOURCES.SOURCING_LINK,
    verb: "DELETE",
  },
};

export const SENSITIVE_AUDIT_ACTIONS: ReadonlySet<string> = new Set(
  Object.entries(AUDIT_ACTION_REGISTRY)
    .filter(([, meta]) => meta.sensitive === true)
    .map(([action]) => action),
);

export const DELETED_ENTITY_AUDIT_ACTIONS: ReadonlySet<string> = new Set(
  Object.entries(AUDIT_ACTION_REGISTRY)
    .filter(([, meta]) => meta.verb === "DELETE")
    .map(([action]) => action),
);

export function getAuditActionMeta(action: string): AuditActionMeta | null {
  return AUDIT_ACTION_REGISTRY[action] ?? null;
}

export function inferAuditVerb(action: string): AuditVerb {
  const meta = getAuditActionMeta(action);
  if (meta) return meta.verb;

  const upper = action.toUpperCase();
  if (/(?:^|_)(CREATED|ADDED|JOINED|SCHEDULED)$/.test(upper)) {
    return "CREATE";
  }
  if (/(?:^|_)(DELETED|REMOVED|REVOKED|CANCELED|LEFT)$/.test(upper)) {
    return "DELETE";
  }
  if (/(?:^|_)(CHANGED|RESET|RESENT)$/.test(upper)) {
    return "STATE";
  }
  if (/^(OWNERSHIP_|PERMISSIONS_)|_RETENTION_|_SECURITY/.test(upper)) {
    return "SECURITY";
  }
  if (/^(VIEW|DOWNLOAD)_/.test(upper)) {
    return "VIEW";
  }
  return "UPDATE";
}

export const AUDIT_RETENTION_PRESETS = [30, 90, 180, 365] as const;

export const updateAuditRetentionSchema = z.object({
  retentionDays: z.union([
    z.literal(30),
    z.literal(90),
    z.literal(180),
    z.literal(365),
    z.null(),
  ]),
});

export type UpdateAuditRetentionSchema = z.infer<
  typeof updateAuditRetentionSchema
>;

export const USER_SECURITY_ACTIONS = {
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGIN_FAILED: "AUTH_LOGIN_FAILED",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  AUTH_PASSWORD_CHANGED: "AUTH_PASSWORD_CHANGED",
  AUTH_SESSION_REVOKED: "AUTH_SESSION_REVOKED",
  AUTH_ALL_SESSIONS_REVOKED: "AUTH_ALL_SESSIONS_REVOKED",
  ACCOUNT_PROFILE_UPDATED: "ACCOUNT_PROFILE_UPDATED",
} as const;

export type UserSecurityAction =
  (typeof USER_SECURITY_ACTIONS)[keyof typeof USER_SECURITY_ACTIONS];
