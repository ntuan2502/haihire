import { describe, expect, it } from "vitest";
import {
  formatAuditFieldLabel,
  formatAuditMetadataLines,
  formatAuditSummary,
  formatAuditValue,
  getAuditActionBadge,
  getAuditActionOptions,
  getAuditEntityHref,
  getAuditResourceLabel,
  parseUserAgent,
} from "./audit-log-formatters";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";

const mockT = (key: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    "settings.auditLog.filterAllActions": "All Actions",
    "settings.auditLog.actions.INVITE_CREATED": "Invitation Created",
    "settings.auditLog.actions.INVITE_RESENT": "Invitation Resent",
    "settings.auditLog.actions.INVITE_REVOKED": "Invitation Revoked",
    "settings.auditLog.actions.EMAIL_SETTINGS_UPDATED":
      "Email Settings Updated",
    "settings.auditLog.actions.WEBHOOK_UPDATED": "Webhook Updated",
    "settings.auditLog.actions.MEMBER_ROLE_CHANGED": "Member Role Changed",
    "settings.auditLog.actions.JOB_STATUS_CHANGED": "Job Status Changed",
    "settings.auditLog.actions.APPLICATION_STAGE_CHANGED":
      "Application Stage Changed",
    "settings.auditLog.actions.INTERVIEW_UPDATED": "Interview Updated",
    "settings.auditLog.actions.AI_CONNECTION_CREATED": "AI Key Added",
    "settings.auditLog.actions.AI_ROUTES_UPDATED": "AI Routing Updated",
    "settings.auditLog.actions.AI_SETTINGS_UPDATED": "AI Settings Updated",
    "settings.auditLog.actions.AI_SETTINGS_DELETED": "AI Settings Deleted",
    "settings.auditLog.verbLabels.CREATE": "Created {resource}",
    "settings.auditLog.verbLabels.UPDATE": "Updated {resource}",
    "settings.auditLog.verbLabels.DELETE": "Deleted {resource}",
    "settings.auditLog.verbLabels.STATE": "Changed {resource}",
    "settings.auditLog.verbLabels.SECURITY": "Security: {resource}",
    "settings.auditLog.verbLabels.VIEW": "Viewed {resource}",
    "settings.auditLog.verbSummaries.CREATE": "Created {resource}: {target}",
    "settings.auditLog.verbSummaries.UPDATE": "Updated {resource}: {target}",
    "settings.auditLog.verbSummaries.DELETE": "Deleted {resource}: {target}",
    "settings.auditLog.verbSummaries.STATE": "Changed {resource}: {target}",
    "settings.auditLog.verbSummaries.SECURITY":
      "Updated security for {resource}: {target}",
    "settings.auditLog.verbSummaries.VIEW": "Viewed {resource}: {target}",
    "settings.auditLog.fieldLabels.scoringConfig": "AI Scoring Criteria",
    "settings.auditLog.fieldLabels.applicationFormConfig":
      "Application Form Configuration",
    "settings.auditLog.fieldLabels.autoScoreApplications":
      "Auto-score Applications",
    "settings.auditLog.fieldLabels.modelId": "AI Model",
    "settings.auditLog.fieldLabels.baseUrl": "Custom Base URL",
    "settings.auditLog.metadataLabels.scoringConfigSummary":
      "{count} criteria · Auto-score: {auto}",
    "settings.auditLog.metadataLabels.applicationFormSummary":
      "{count} screening questions",
    "settings.auditLog.resources.ORGANIZATION": "Organization",
    "settings.auditLog.resources.INVITATION": "Invitation",
    "settings.auditLog.resources.EMAIL": "Email",
    "settings.auditLog.resources.WEBHOOK": "Webhook",
    "settings.auditLog.resources.AI": "AI Provider",
    "settings.auditLog.resources.JOB": "Job Opening",
    "settings.auditLog.resources.APPLICATION": "Application",
    "settings.auditLog.resources.OTHER": "Other",
    "settings.auditLog.fieldLabels.smtpPass": "SMTP Password",
    "settings.auditLog.fieldLabels.stage": "Pipeline Stage",
    "settings.rolesMatrix.permissions.job_create": "Create jobs",
    "settings.auditLog.valueEmpty": "Empty",
    "settings.auditLog.valueRedacted": "Redacted",
    "settings.auditLog.permissionGranted": "Granted",
    "settings.auditLog.permissionRevoked": "Revoked",
    "settings.auditLog.metadataLabels.summaryMemberRoleChanged":
      "Changed role of {target}: {oldRole} → {newRole}",
    "settings.auditLog.metadataLabels.summaryJobStatusChanged":
      "Changed status of {target}: {oldStatus} → {newStatus}",
    "settings.auditLog.metadataLabels.summaryApplicationStageChanged":
      "Moved {target}: {oldStage} → {newStage}",
    "settings.auditLog.metadataLabels.summaryInterviewScorecardSubmitted":
      "Submitted interview scorecard for {target}",
    "settings.auditLog.metadataLabels.summaryInviteCreated":
      "Created invitation for {target} ({role})",
    "settings.auditLog.metadataLabels.summaryRolePermissionsUpdated":
      "Updated {count} permissions for role {target}",
    "settings.auditLog.metadataLabels.allRoles": "All roles",
    "jobs.openStatus": "Published",
    "jobs.closed": "Closed",
    "pipeline.stages.screening": "Screening",
    "pipeline.stages.interview": "Interview",
    "members.roleRecruiter": "Recruiter",
    "members.roleMember": "Member",
    "common.yes": "Yes",
    "common.no": "No",
  };
  let text = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
};

describe("audit-log-formatters", () => {
  it("resolves SSOT action badges, resource labels, and filtered action options", () => {
    expect(getAuditActionBadge("INVITE_CREATED", mockT).label).toBe(
      "Invitation Created",
    );
    expect(getAuditResourceLabel("WEBHOOK", mockT)).toBe("Webhook");
    expect(getAuditResourceLabel("AI", mockT)).toBe("AI Provider");
    expect(getAuditResourceLabel("UNKNOWN", mockT)).toBe("Other");

    const inviteOptions = getAuditActionOptions("INVITATION", mockT);
    expect(inviteOptions.map((o) => o.value)).toEqual([
      "",
      "INVITE_CREATED",
      "INVITE_RESENT",
      "INVITE_REVOKED",
    ]);

    const aiOptions = getAuditActionOptions("AI", mockT);
    expect(aiOptions.map((o) => o.value)).toEqual([
      "",
      "AI_POLICY_UPDATED",
      "AI_CONNECTION_CREATED",
      "AI_CONNECTION_UPDATED",
      "AI_CONNECTION_DELETED",
      "AI_ROUTES_UPDATED",
      "AI_SETTINGS_UPDATED",
      "AI_SETTINGS_DELETED",
    ]);
  });

  it("parses browser and OS cleanly from raw User-Agent headers", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome · Windows");
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Firefox/132.0",
      ),
    ).toBe("Firefox · macOS");
    expect(parseUserAgent("PostmanRuntime/7.40.0")).toBe("Postman");
    expect(parseUserAgent(null)).toBeNull();
  });

  it("formats field labels, redacted secrets, permission booleans, and summaries", () => {
    expect(formatAuditFieldLabel("smtpPass", mockT)).toBe("SMTP Password");
    expect(formatAuditFieldLabel("job:create", mockT)).toBe("Create jobs");
    expect(formatAuditValue("smtpPass", "[REDACTED]", mockT)).toBe("Redacted");
    expect(formatAuditValue("logoObjectKey", null, mockT)).toBe("Empty");
    expect(formatAuditValue("job:create", true, mockT)).toBe("Granted");
    expect(formatAuditValue("enabled", false, mockT)).toBe("No");

    const roleLog: OrganizationAuditLogRecord = {
      id: "log-role",
      organizationId: "org-1",
      actorId: "u-1",
      action: "MEMBER_ROLE_CHANGED",
      resource: "MEMBER",
      targetId: "u-2",
      targetLabel: "Tran Minh",
      changes: [{ field: "role", before: "MEMBER", after: "RECRUITER" }],
      metadata: { oldRole: "MEMBER", newRole: "RECRUITER" },
      createdAt: "2026-10-23T10:00:00Z",
      actor: null,
    };

    expect(formatAuditSummary(roleLog, mockT)).toBe(
      "Changed role of Tran Minh: Member → Recruiter",
    );
    expect(formatAuditMetadataLines(roleLog, mockT).length).toBeGreaterThan(0);
  });

  it("formats ATS statuses, stages, summaries, and resolves deep-link URLs", () => {
    expect(getAuditActionBadge("JOB_STATUS_CHANGED", mockT).label).toBe(
      "Job Status Changed",
    );
    expect(getAuditResourceLabel("JOB", mockT)).toBe("Job Opening");
    expect(formatAuditValue("status", "PUBLISHED", mockT)).toBe("Published");
    expect(formatAuditValue("stage", "SCREENING", mockT)).toBe("Screening");

    const jobStatusLog: OrganizationAuditLogRecord = {
      id: "log-job",
      organizationId: "org-1",
      actorId: "u-1",
      action: "JOB_STATUS_CHANGED",
      resource: "JOB",
      targetId: "job-99",
      targetLabel: "Senior Backend Engineer",
      changes: [{ field: "status", before: "PUBLISHED", after: "CLOSED" }],
      metadata: null,
      createdAt: "2026-10-23T10:00:00Z",
      actor: null,
    };
    expect(formatAuditSummary(jobStatusLog, mockT)).toBe(
      "Changed status of Senior Backend Engineer: Published → Closed",
    );
    expect(getAuditEntityHref(jobStatusLog)).toBe("/jobs/job-99");
    expect(
      getAuditEntityHref({ ...jobStatusLog, action: "JOB_DELETED" }),
    ).toBeNull();

    const appStageLog: OrganizationAuditLogRecord = {
      id: "log-app",
      organizationId: "org-1",
      actorId: "u-1",
      action: "APPLICATION_STAGE_CHANGED",
      resource: "APPLICATION",
      targetId: "app-42",
      targetLabel: "Le Van A — Senior Backend Engineer",
      changes: [{ field: "stage", before: "SCREENING", after: "INTERVIEW" }],
      metadata: null,
      createdAt: "2026-10-23T10:00:00Z",
      actor: null,
    };
    expect(formatAuditSummary(appStageLog, mockT)).toBe(
      "Moved Le Van A — Senior Backend Engineer: Screening → Interview",
    );
    expect(getAuditEntityHref(appStageLog)).toBe("/applications/app-42");

    expect(
      getAuditEntityHref({
        resource: "CANDIDATE",
        action: "CANDIDATE_UPDATED",
        targetId: "cand-7",
      }),
    ).toBe("/candidates/cand-7");

    expect(
      formatAuditSummary(
        {
          id: "log-sc",
          organizationId: "org-1",
          actorId: "u-1",
          action: "INTERVIEW_UPDATED",
          resource: "INTERVIEW",
          targetId: "intv-1",
          targetLabel: "Le Van A — Senior Backend Engineer",
          changes: null,
          metadata: { scorecardSubmitted: true },
          createdAt: "2026-10-23T10:00:00Z",
          actor: null,
        },
        mockT,
      ),
    ).toBe(
      "Submitted interview scorecard for Le Van A — Senior Backend Engineer",
    );
  });

  it("formats AI settings, new AI multi-key actions, and auto-humanizes unregistered future actions/fields", () => {
    expect(getAuditActionBadge("AI_SETTINGS_UPDATED", mockT).label).toBe(
      "AI Settings Updated",
    );
    expect(getAuditActionBadge("AI_SETTINGS_DELETED", mockT).label).toBe(
      "AI Settings Deleted",
    );
    expect(getAuditActionBadge("AI_CONNECTION_CREATED", mockT).label).toBe(
      "AI Key Added",
    );
    expect(
      getAuditActionBadge("AI_CONNECTION_CREATED", mockT).className,
    ).toContain("bg-emerald-100");

    expect(formatAuditFieldLabel("scoringConfig", mockT)).toBe(
      "AI Scoring Criteria",
    );
    expect(formatAuditFieldLabel("applicationFormConfig", mockT)).toBe(
      "Application Form Configuration",
    );
    expect(formatAuditFieldLabel("autoScoreApplications", mockT)).toBe(
      "Auto-score Applications",
    );
    expect(formatAuditFieldLabel("modelId", mockT)).toBe("AI Model");
    expect(formatAuditFieldLabel("baseUrl", mockT)).toBe("Custom Base URL");
    // Unmapped field auto-humanizes without maintaining a hardcoded allowlist
    expect(formatAuditFieldLabel("customWebhookTimeout", mockT)).toBe(
      "Custom webhook timeout",
    );

    expect(
      formatAuditValue(
        "scoringConfig",
        { criteria: [{ id: "1" }, { id: "2" }], autoScore: true },
        mockT,
      ),
    ).toBe("2 criteria · Auto-score: Yes");
    expect(
      formatAuditValue(
        "applicationFormConfig",
        { screeningQuestions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }] },
        mockT,
      ),
    ).toBe("3 screening questions");

    expect(
      formatAuditSummary(
        {
          id: "log-ai",
          organizationId: "org-1",
          actorId: "u-1",
          action: "AI_CONNECTION_CREATED",
          resource: "AI",
          targetId: "conn-1",
          targetLabel: "Gemini Primary (GEMINI)",
          changes: null,
          metadata: { provider: "GEMINI" },
          createdAt: "2026-11-26T10:00:00Z",
          actor: null,
        },
        mockT,
      ),
    ).toBe("Created AI Provider: Gemini Primary (GEMINI)");

    // Brand-new unregistered action degrades gracefully with inferred verb styling & summary
    const futureBadge = getAuditActionBadge("CUSTOM_WORKFLOW_CREATED", mockT);
    expect(futureBadge.label).toBe("Custom workflow created");
    expect(futureBadge.className).toContain("bg-emerald-100");
    expect(
      formatAuditSummary(
        {
          id: "log-future",
          organizationId: "org-1",
          actorId: "u-1",
          action: "CUSTOM_WORKFLOW_CREATED",
          resource: "ORGANIZATION",
          targetId: "wf-1",
          targetLabel: "Screening Auto-Assign",
          changes: null,
          metadata: null,
          createdAt: "2026-11-27T10:00:00Z",
          actor: null,
        },
        mockT,
      ),
    ).toBe("Created Organization: Screening Auto-Assign");
  });
});
