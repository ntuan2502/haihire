import type { PlaceholderDataFunction } from "@tanstack/react-query";

function extractOrgIdFromQueryKey(
  queryKey: readonly unknown[] | undefined,
): string | null | undefined {
  if (!Array.isArray(queryKey)) return undefined;
  for (const segment of queryKey) {
    if (segment && typeof segment === "object" && "orgId" in segment) {
      return (segment as { orgId?: string | null }).orgId;
    }
  }
  return undefined;
}

/**
 * Replacement for TanStack `keepPreviousData` in multi-tenant list hooks.
 * Preserves previous page/filter results only while `orgId` matches; clears
 * immediately on organization switch or sign-out so stale tenant rows never flash.
 */
export function keepPreviousDataForSameOrg<TData>(
  currentOrgId?: string | null,
): PlaceholderDataFunction<TData> {
  return (previousData, previousQuery) => {
    if (!previousQuery) return undefined;
    const prevOrgId = extractOrgIdFromQueryKey(previousQuery.queryKey);
    if ((prevOrgId ?? null) !== (currentOrgId ?? null)) {
      return undefined;
    }
    return previousData;
  };
}

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
  myOrg: (orgId?: string | null) =>
    orgId !== undefined
      ? (["organization", "my", { orgId }] as const)
      : (["organization", "my"] as const),
  myOrgs: () => ["organization", "my-all"] as const,
  orgMembers: (orgId?: string | null) =>
    orgId !== undefined
      ? (["organization", "members", { orgId }] as const)
      : (["organization", "members"] as const),
  orgInterviewers: (orgId?: string | null) =>
    orgId !== undefined
      ? (["organization", "interviewers", { orgId }] as const)
      : (["organization", "interviewers"] as const),
  inviteLinks: (orgId?: string | null) =>
    orgId !== undefined
      ? (["organization", "invite-links", { orgId }] as const)
      : (["organization", "invite-links"] as const),
  rolePermissionsMatrix: (orgId?: string | null) =>
    orgId !== undefined
      ? (["organization", "roles", "permissions", { orgId }] as const)
      : (["organization", "roles", "permissions"] as const),
  myPermissions: (orgId?: string | null, role?: string | null) =>
    orgId !== undefined
      ? ([
          "auth",
          "me",
          "permissions",
          { orgId, ...(role ? { role } : {}) },
        ] as const)
      : (["auth", "me", "permissions"] as const),
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
