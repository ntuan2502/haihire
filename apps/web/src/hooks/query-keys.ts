export const queryKeys = {
  jobs: (orgId?: string | null) => ["jobs", { orgId }] as const,
  jobStages: (jobId?: string | null, orgId?: string | null) =>
    ["jobs", "stages", jobId, { orgId }] as const,
  applications: (jobId?: string | null, orgId?: string | null) =>
    ["applications", { orgId, jobId }] as const,
  application: (id?: string | null, orgId?: string | null) =>
    orgId !== undefined
      ? (["applications", "detail", id, { orgId }] as const)
      : (["applications", "detail", id] as const),
  applicationNotes: (applicationId?: string | null, orgId?: string | null) =>
    orgId !== undefined
      ? (["applications", "notes", applicationId, { orgId }] as const)
      : (["applications", "notes", applicationId] as const),
  applicationStats: (orgId?: string | null) =>
    ["applications", "stats", { orgId }] as const,
  paginatedApplications: (params?: Record<string, unknown>) =>
    ["applications", "paginated", params] as const,
  candidates: (orgId?: string | null) => ["candidates", { orgId }] as const,
  candidate: (id?: string | null, orgId?: string | null) =>
    orgId !== undefined
      ? (["candidates", id, { orgId }] as const)
      : (["candidates", id] as const),
  candidateNotes: (candidateId?: string | null, orgId?: string | null) =>
    orgId !== undefined
      ? (["candidates", "notes", candidateId, { orgId }] as const)
      : (["candidates", "notes", candidateId] as const),
  interviews: (params?: Record<string, unknown>) =>
    ["interviews", params] as const,
  interview: (id?: string | null, orgId?: string | null) =>
    orgId !== undefined
      ? (["interviews", "detail", id, { orgId }] as const)
      : (["interviews", "detail", id] as const),
  myOrg: () => ["organization", "my"] as const,
  myOrgs: () => ["organization", "my-all"] as const,
  orgMembers: () => ["organization", "members"] as const,
  orgInterviewers: () => ["organization", "interviewers"] as const,
  inviteLinks: () => ["organization", "invite-links"] as const,
  rolePermissionsMatrix: () =>
    ["organization", "roles", "permissions"] as const,
  myPermissions: () => ["auth", "me", "permissions"] as const,
  auditLogs: (params?: Record<string, unknown>) =>
    ["organization", "audit-logs", params] as const,
  emailTemplates: (orgId?: string | null) =>
    ["email", "templates", { orgId }] as const,
  emailFlows: (orgId?: string | null) => ["email", "flows", { orgId }] as const,
  emailSettings: (orgId?: string | null) =>
    ["email", "settings", { orgId }] as const,
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
  ) =>
    ["activities", "candidate", candidateId, { orgId, page, limit }] as const,
  applicationActivities: (
    applicationId?: string | null,
    orgId?: string | null,
    page?: number,
    limit?: number,
  ) =>
    [
      "activities",
      "application",
      applicationId,
      { orgId, page, limit },
    ] as const,
  sourcingStats: (params?: {
    timeRange?: string;
    jobId?: string;
    orgId?: string | null;
  }) => ["sourcing", "stats", params] as const,
  sourcingLinks: (params?: Record<string, unknown>) =>
    ["sourcing", "links", params] as const,
  sourcingLinkDetail: (
    id: string,
    params?: { timeRange?: string; orgId?: string | null },
  ) => ["sourcing", "links", id, params] as const,
  sourcingAttributionLog: (params?: Record<string, unknown>) =>
    ["sourcing", "attribution-log", params] as const,
  webhookSettings: (orgId?: string | null) =>
    ["webhook-settings", { orgId }] as const,
  webhookSetting: (id?: string | null) =>
    ["webhook-settings", "detail", id] as const,
};
