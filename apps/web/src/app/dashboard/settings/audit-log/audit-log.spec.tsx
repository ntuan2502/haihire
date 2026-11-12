import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuditLogPage from "./page";

let mockCanViewAuditLog = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanViewAuditLog,
}));

let mockAuditLogLoading = false;
let mockAuditLogError: Error | null = null;
let mockAuditLogData = {
  data: [
    {
      id: "log-1",
      organizationId: "org-1",
      actorId: "user-1",
      action: "ROLE_PERMISSIONS_UPDATED",
      resource: "ROLE_PERMISSIONS",
      metadata: { role: "RECRUITER", changes: 2 },
      createdAt: "2026-10-23T10:00:00Z",
      actor: {
        id: "user-1",
        name: "Alice Admin",
        email: "alice@haihire.local",
        role: "ADMIN",
        avatarUrl: null,
      },
    },
    {
      id: "log-2",
      organizationId: "org-1",
      actorId: null,
      action: "MEMBER_ROLE_CHANGED",
      resource: "MEMBER",
      metadata: { memberId: "user-2", oldRole: "MEMBER", newRole: "RECRUITER" },
      createdAt: "2026-10-23T09:30:00Z",
      actor: null,
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

let capturedQueryParams: unknown = null;

vi.mock("@/hooks/use-organization-queries", () => ({
  useAuditLogsQuery: (params?: unknown) => {
    capturedQueryParams = params;
    return {
      data: mockAuditLogData,
      isLoading: mockAuditLogLoading,
      isError: Boolean(mockAuditLogError),
      error: mockAuditLogError,
    };
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "settings.auditLog.title": "Audit Log",
        "settings.auditLog.description":
          "Track administrative changes and security events.",
        "settings.auditLog.badge": "Security & Governance",
        "settings.auditLog.accessDenied":
          "You do not have permission to view the audit log.",
        "settings.auditLog.filterAllActions": "All Actions",
        "settings.auditLog.filterAction": "Filter by action",
        "settings.auditLog.colTimestamp": "Timestamp",
        "settings.auditLog.colActor": "Actor",
        "settings.auditLog.colAction": "Action",
        "settings.auditLog.colResource": "Resource",
        "settings.auditLog.colMetadata": "Details",
        "settings.auditLog.emptyTitle": "No audit events found",
        "settings.auditLog.emptyDescription": "No actions matching the filter.",
        "settings.auditLog.paginationShowing":
          "Showing {offset} to {end} of {total} events",
        "settings.auditLog.paginationPrev": "Previous",
        "settings.auditLog.paginationNext": "Next",
        "settings.auditLog.systemActor": "System",
        "settings.auditLog.noMetadata": "No details",
        "settings.auditLog.actionRolePermissionsUpdated": "Permissions Updated",
        "settings.auditLog.actionRolePermissionsReset": "Permissions Reset",
        "settings.auditLog.actionMemberRoleChanged": "Member Role Changed",
        "settings.auditLog.actionOwnershipTransferred": "Ownership Transferred",
        "settings.auditLog.actionOrgDeleted": "Organization Deleted",
        "settings.auditLog.actionOrgLocalizationUpdated":
          "Localization Updated",
        "settings.auditLog.resources.ORGANIZATION": "Organization",
        "settings.auditLog.resources.MEMBER": "Member",
        "settings.auditLog.resources.ROLE_PERMISSIONS": "Role Permissions",
        "settings.auditLog.resources.SYSTEM": "System",
        "settings.auditLog.resources.OTHER": "Other",
        "settings.auditLog.metadataLabels.roleTarget": "Role: {role}",
        "settings.auditLog.metadataLabels.allRoles": "All roles",
        "settings.auditLog.metadataLabels.roleChanged": "{oldRole} → {newRole}",
        "settings.auditLog.metadataLabels.permissionsUpdated":
          "{count} permissions updated",
        "settings.auditLog.metadataLabels.ownershipTransferred":
          "Organization ownership transferred",
        "settings.auditLog.metadataLabels.localizationUpdated":
          "Updated localization: {fields}",
        "settings.backToSettings": "Back to Settings",
        "errors.forbidden.title": "Access Denied",
        "common.pagination": "Pagination",
        "common.showing": "Showing",
        "common.of": "of",
        "common.rows": "Rows",
        "common.page": "Page",
        "common.previous": "Previous",
        "common.next": "Next",
        "common.noData": "No data",
        "members.roleOwner": "Owner",
        "members.roleAdmin": "Admin",
        "members.roleRecruiter": "Recruiter",
        "members.roleHiringManager": "Hiring Manager",
        "members.roleInterviewer": "Interviewer",
        "members.roleMember": "Member",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("AuditLogPage", () => {
  beforeEach(() => {
    mockCanViewAuditLog = true;
    mockAuditLogLoading = false;
    mockAuditLogError = null;
    capturedQueryParams = null;
    mockAuditLogData = {
      data: [
        {
          id: "log-1",
          organizationId: "org-1",
          actorId: "user-1",
          action: "ROLE_PERMISSIONS_UPDATED",
          resource: "ROLE_PERMISSIONS",
          metadata: { role: "RECRUITER", changes: 2 },
          createdAt: "2026-10-23T10:00:00Z",
          actor: {
            id: "user-1",
            name: "Alice Admin",
            email: "alice@haihire.local",
            role: "ADMIN",
            avatarUrl: null,
          },
        },
        {
          id: "log-2",
          organizationId: "org-1",
          actorId: null,
          action: "MEMBER_ROLE_CHANGED",
          resource: "MEMBER",
          metadata: {
            memberId: "user-2",
            oldRole: "MEMBER",
            newRole: "RECRUITER",
          },
          createdAt: "2026-10-23T09:30:00Z",
          actor: null,
        },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    };
  });

  it("renders access denied banner when user lacks org:view_audit_log", () => {
    mockCanViewAuditLog = false;
    render(<AuditLogPage />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.getByText("You do not have permission to view the audit log."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders audit log table with actor, action badge, and resource when authorized", () => {
    render(<AuditLogPage />);

    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("alice@haihire.local")).toBeInTheDocument();
    expect(screen.getAllByText("Permissions Updated").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Role Permissions")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getAllByText("Member Role Changed").length).toBeGreaterThan(
      0,
    );
  });

  it("allows filtering by action via custom select dropdown", () => {
    render(<AuditLogPage />);

    const trigger = screen.getByRole("button", { name: "Filter by action" });
    fireEvent.click(trigger);

    const option = screen.getByRole("option", { name: "Permissions Updated" });
    fireEvent.click(option);

    expect(capturedQueryParams).toMatchObject({
      action: "ROLE_PERMISSIONS_UPDATED",
      limit: 20,
      offset: 0,
    });
  });

  it("expands and collapses inline metadata sub-row when details button is clicked", () => {
    render(<AuditLogPage />);

    const detailsButtons = screen.getAllByRole("button", { name: "Details" });
    expect(detailsButtons.length).toBeGreaterThan(0);
    expect(detailsButtons[0]).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(detailsButtons[0]);

    expect(detailsButtons[0]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Role: Recruiter")).toBeInTheDocument();
    expect(screen.getByText("2 permissions updated")).toBeInTheDocument();

    fireEvent.click(detailsButtons[0]);
    expect(detailsButtons[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Role: Recruiter")).not.toBeInTheDocument();
  });

  it("paginates via Pagination controls and resets offset on page size change", () => {
    mockAuditLogData = {
      ...mockAuditLogData,
      total: 45,
    };

    render(<AuditLogPage />);

    expect(screen.getByText(/Showing 1–20 of 45/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(capturedQueryParams).toMatchObject({
      limit: 20,
      offset: 20,
    });

    const pageSizeTrigger = screen.getByRole("button", { name: "20" });
    fireEvent.click(pageSizeTrigger);
    fireEvent.click(screen.getByRole("option", { name: "50" }));

    expect(capturedQueryParams).toMatchObject({
      limit: 50,
      offset: 0,
    });
  });

  it("renders empty state when there are zero audit logs", () => {
    mockAuditLogData = {
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    };

    render(<AuditLogPage />);

    expect(screen.getByText("No audit events found")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
