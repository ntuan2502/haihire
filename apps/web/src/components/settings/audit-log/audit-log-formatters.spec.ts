import { describe, expect, it } from "vitest";
import {
  formatAuditFieldLabel,
  formatAuditMetadataLines,
  formatAuditSummary,
  formatAuditValue,
  getAuditActionBadge,
  getAuditActionOptions,
  getAuditResourceLabel,
  parseUserAgent,
} from "./audit-log-formatters";
import type { OrganizationAuditLogRecord } from "@/lib/api/organizations";

const mockT = (key: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    "settings.auditLog.filterAllActions": "All Actions",
    "settings.auditLog.actionInviteCreated": "Invitation Created",
    "settings.auditLog.actionEmailSettingsUpdated": "Email Settings Updated",
    "settings.auditLog.actionWebhookUpdated": "Webhook Updated",
    "settings.auditLog.actionMemberRoleChanged": "Member Role Changed",
    "settings.auditLog.resources.INVITATION": "Invitation",
    "settings.auditLog.resources.EMAIL": "Email",
    "settings.auditLog.resources.WEBHOOK": "Webhook",
    "settings.auditLog.resources.OTHER": "Other",
    "settings.auditLog.fieldLabels.smtpPass": "SMTP Password",
    "settings.rolesMatrix.permissions.job_create": "Create jobs",
    "settings.auditLog.valueEmpty": "Empty",
    "settings.auditLog.valueRedacted": "Redacted",
    "settings.auditLog.permissionGranted": "Granted",
    "settings.auditLog.permissionRevoked": "Revoked",
    "settings.auditLog.metadataLabels.summaryMemberRoleChanged":
      "Changed role of {target}: {oldRole} → {newRole}",
    "settings.auditLog.metadataLabels.summaryInviteCreated":
      "Created invitation for {target} ({role})",
    "settings.auditLog.metadataLabels.summaryRolePermissionsUpdated":
      "Updated {count} permissions for role {target}",
    "settings.auditLog.metadataLabels.allRoles": "All roles",
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
  it("resolves Phase 1 action badges, resource labels, and filtered action options", () => {
    expect(getAuditActionBadge("INVITE_CREATED", mockT).label).toBe(
      "Invitation Created",
    );
    expect(getAuditResourceLabel("WEBHOOK", mockT)).toBe("Webhook");
    expect(getAuditResourceLabel("UNKNOWN", mockT)).toBe("Other");

    const inviteOptions = getAuditActionOptions("INVITATION", mockT);
    expect(inviteOptions.map((o) => o.value)).toEqual([
      "",
      "INVITE_CREATED",
      "INVITE_RESENT",
      "INVITE_REVOKED",
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
});
