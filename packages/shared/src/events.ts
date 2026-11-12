export const APP_EVENT_TYPES = [
  "CONNECTED",
  "HEARTBEAT",
  "ORG_UPDATED",
  "MEMBERS_CHANGED",
  "MEMBER_ROLE_UPDATED",
  "MEMBER_REMOVED",
  "INVITE_LINKS_CHANGED",
  "PERMISSIONS_CHANGED",
  "JOBS_CHANGED",
  "CANDIDATES_CHANGED",
  "APPLICATIONS_CHANGED",
  "INTERVIEWS_CHANGED",
  "SOURCING_CHANGED",
  "EMAIL_CHANGED",
  "WEBHOOKS_CHANGED",
  "AUDIT_LOGS_CHANGED",
  "ACTIVITIES_CHANGED",
] as const;

export type AppEventType = (typeof APP_EVENT_TYPES)[number];

export interface AppEvent {
  type: AppEventType;
  targetUserId?: string;
  organizationId?: string | null;
  role?: string;
  data?: Record<string, unknown>;
}

const APP_EVENT_TYPE_SET: ReadonlySet<string> = new Set(APP_EVENT_TYPES);

export function isAppEventType(value: unknown): value is AppEventType {
  return typeof value === "string" && APP_EVENT_TYPE_SET.has(value);
}
