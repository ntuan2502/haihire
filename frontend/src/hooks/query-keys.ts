export const queryKeys = {
  jobs: (orgId?: string | null) => ["jobs", { orgId }] as const,
  applications: (jobId?: string | null) => ["applications", { jobId }] as const,
  application: (id?: string | null) => ["applications", "detail", id] as const,
  allApplications: (orgId?: string | null) => ["applications", "all", { orgId }] as const,
  paginatedApplications: (params?: Record<string, unknown>) => ["applications", "paginated", params] as const,
  candidates: (orgId?: string | null) => ["candidates", { orgId }] as const,
  candidate: (id?: string | null) => ["candidates", id] as const,
  interviews: (params?: Record<string, unknown>) => ["interviews", params] as const,
  interview: (id?: string | null) => ["interviews", "detail", id] as const,
  myOrg: () => ["organization", "my"] as const,
  myOrgs: () => ["organization", "my-all"] as const,
  orgMembers: () => ["organization", "members"] as const,
  inviteLinks: () => ["organization", "invite-links"] as const,
  emailTemplates: (orgId?: string | null) => ["email", "templates", { orgId }] as const,
  emailSettings: (orgId?: string | null) => ["email", "settings", { orgId }] as const,
  emailLogs: (params?: {
    orgId?: string | null;
    candidateId?: string | null;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => ["email", "logs", params] as const,
  candidateActivities: (
    candidateId?: string | null,
    orgId?: string | null,
    page?: number,
    limit?: number,
  ) => ["activities", "candidate", candidateId, { orgId, page, limit }] as const,
  applicationActivities: (
    applicationId?: string | null,
    orgId?: string | null,
    page?: number,
    limit?: number,
  ) => ["activities", "application", applicationId, { orgId, page, limit }] as const,
  sourcingStats: (params?: { timeRange?: string; jobId?: string }) => ["sourcing", "stats", params] as const,
  sourcingLinks: (params?: Record<string, unknown>) => ["sourcing", "links", params] as const,
  sourcingLinkDetail: (id: string, params?: { timeRange?: string }) => ["sourcing", "links", id, params] as const,
  sourcingAttributionLog: (params?: Record<string, unknown>) => ["sourcing", "attribution-log", params] as const,
  webhookSettings: (orgId?: string | null) => ["webhook-settings", { orgId }] as const,
  webhookSetting: (id?: string | null) => ["webhook-settings", "detail", id] as const,
};
