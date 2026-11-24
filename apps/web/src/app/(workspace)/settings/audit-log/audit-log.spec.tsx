import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import AuditLogPage from "./page";
import { organizationsApi } from "@/lib/api/organizations";
import { toast } from "@/lib/toast";

let mockSearchParamString = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings/audit-log",
  useSearchParams: () => new URLSearchParams(mockSearchParamString),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/organizations", () => ({
  organizationsApi: {
    exportAuditLogs: vi.fn(),
  },
}));

let mockCanViewAuditLog = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanViewAuditLog,
}));

const mockMembers = [
  {
    id: "user-1",
    firstName: "Alice",
    lastName: "Admin",
    name: "Alice Admin",
    email: "alice@haihire.local",
    role: "ADMIN",
    avatarUrl: null,
  },
];

let mockAuditLogLoading = false;
let mockAuditLogError: Error | null = null;
let mockAuditLogData = {
  data: [] as Array<Record<string, unknown>>,
  total: 0,
  limit: 20,
  offset: 0,
};

let capturedQueryParams: unknown = null;
let capturedMembersOptions: unknown = null;

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
  useOrgMembers: (options?: unknown) => {
    capturedMembersOptions = options;
    return {
      data: mockCanViewAuditLog ? mockMembers : [],
    };
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        "settings.auditLog.title": "Audit Log",
        "settings.auditLog.description":
          "Track administrative changes and security events.",
        "settings.auditLog.filterAllActions": "All Actions",
        "settings.auditLog.filterAction": "Filter by action",
        "settings.auditLog.searchPlaceholder":
          "Search actor, target, action, or request ID...",
        "settings.auditLog.filterResource": "Filter by resource",
        "settings.auditLog.filterAllResources": "All Resources",
        "settings.auditLog.filterActor": "Filter by actor",
        "settings.auditLog.filterAllActors": "All Actors",
        "settings.auditLog.filterDateRange": "Date range",
        "settings.auditLog.dateRangeAll": "All time",
        "settings.auditLog.dateRange24h": "Last 24 hours",
        "settings.auditLog.dateRange7d": "Last 7 days",
        "settings.auditLog.dateRange30d": "Last 30 days",
        "settings.auditLog.resetFilters": "Reset filters",
        "settings.auditLog.exportButton": "Export",
        "settings.auditLog.exportCsv": "Export CSV",
        "settings.auditLog.exportJson": "Export JSON",
        "settings.auditLog.exportSuccess": "Audit log exported successfully.",
        "settings.auditLog.exportError": "Failed to export audit log.",
        "settings.auditLog.targetTimelineBanner":
          "Showing event timeline for target: {target}",
        "settings.auditLog.clearTargetTimeline": "Show all targets",
        "settings.auditLog.colTimestamp": "Timestamp",
        "settings.auditLog.colActor": "Actor",
        "settings.auditLog.colAction": "Action",
        "settings.auditLog.colSummary": "Summary",
        "settings.auditLog.colMetadata": "Details",
        "settings.auditLog.viewDetails": "Inspect",
        "settings.auditLog.drawerTitle": "Audit Event Details",
        "settings.auditLog.sectionChanges": "Changes (Before → After)",
        "settings.auditLog.noChangesRecorded": "No diff recorded",
        "settings.auditLog.colBefore": "Before",
        "settings.auditLog.colAfter": "After",
        "settings.auditLog.sectionContext": "Event & Trace Context",
        "settings.auditLog.labelActor": "Actor",
        "settings.auditLog.labelTarget": "Target",
        "settings.auditLog.labelTargetId": "Target ID",
        "settings.auditLog.labelIpAddress": "IP Address",
        "settings.auditLog.labelClient": "Client / Browser",
        "settings.auditLog.labelRequestId": "Request ID",
        "settings.auditLog.viewEntityTimeline": "View full entity timeline",
        "settings.auditLog.openEntity": "Open record",
        "settings.auditLog.rawPayload": "Raw JSON Payload",
        "settings.auditLog.showRawJson": "Show raw JSON",
        "settings.auditLog.hideRawJson": "Hide raw JSON",
        "settings.auditLog.valueEmpty": "Empty",
        "settings.auditLog.valueRedacted": "Redacted",
        "settings.auditLog.permissionGranted": "Granted",
        "settings.auditLog.permissionRevoked": "Revoked",
        "settings.auditLog.emptyTitle": "No audit events found",
        "settings.auditLog.emptyDescription": "No actions matching the filter.",
        "settings.auditLog.systemActor": "System",
        "settings.auditLog.actionRolePermissionsUpdated": "Permissions Updated",
        "settings.auditLog.actionMemberRoleChanged": "Member Role Changed",
        "settings.auditLog.actionInviteCreated": "Invitation Created",
        "settings.auditLog.actionJobStatusChanged": "Job Status Changed",
        "settings.auditLog.resources.ORGANIZATION": "Organization",
        "settings.auditLog.resources.MEMBER": "Member",
        "settings.auditLog.resources.INVITATION": "Invitation",
        "settings.auditLog.resources.ROLE_PERMISSIONS": "Role Permissions",
        "settings.auditLog.resources.EMAIL": "Email",
        "settings.auditLog.resources.WEBHOOK": "Webhook",
        "settings.auditLog.resources.JOB": "Job Opening",
        "settings.auditLog.resources.SYSTEM": "System",
        "settings.auditLog.resources.OTHER": "Other",
        "settings.auditLog.fieldLabels.role": "Role",
        "settings.auditLog.metadataLabels.roleTarget": "Role: {role}",
        "settings.auditLog.metadataLabels.allRoles": "All roles",
        "settings.auditLog.metadataLabels.permissionsUpdated":
          "{count} permissions updated",
        "settings.auditLog.metadataLabels.summaryMemberRoleChanged":
          "Changed role of {target}: {oldRole} → {newRole}",
        "settings.auditLog.metadataLabels.summaryRolePermissionsUpdated":
          "Updated {count} permissions for role {target}",
        "settings.auditLog.metadataLabels.summaryJobStatusChanged":
          "Changed status of {target}: {oldStatus} → {newStatus}",
        "settings.rolesMatrix.permissions.job_create": "Create jobs",
        "jobs.openStatus": "Published",
        "jobs.closed": "Closed",
        "settings.backToSettings": "Back to Settings",
        "errors.forbidden.title": "Access Denied",
        "common.copy": "Copy",
        "common.copied": "Copied",
        "common.clearSearch": "Clear search",
        "common.pagination": "Pagination",
        "common.showing": "Showing",
        "common.of": "of",
        "common.rows": "Rows",
        "common.page": "Page",
        "common.next": "Next",
        "common.previous": "Previous",
        "common.noData": "No data",
        "members.roleRecruiter": "Recruiter",
        "members.roleMember": "Member",
      };
      let text = translations[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
  }),
}));

describe("AuditLogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamString = "";
    window.history.replaceState(null, "", "/settings/audit-log");
    mockCanViewAuditLog = true;
    mockAuditLogLoading = false;
    mockAuditLogError = null;
    capturedQueryParams = null;
    capturedMembersOptions = null;
    mockAuditLogData = {
      data: [
        {
          id: "log-1",
          organizationId: "org-1",
          actorId: "user-1",
          action: "ROLE_PERMISSIONS_UPDATED",
          resource: "ROLE_PERMISSIONS",
          targetId: "RECRUITER",
          targetLabel: "Recruiter",
          changes: [{ field: "job:create", before: false, after: true }],
          metadata: { role: "RECRUITER", changes: 1 },
          ipAddress: "203.0.113.10",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0.0.0 Safari/537.36",
          requestId: "req-abc-123",
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
          targetId: "user-2",
          targetLabel: "Tran Minh",
          changes: [{ field: "role", before: "MEMBER", after: "RECRUITER" }],
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

  it("renders access denied banner and disables queries when user lacks org:view_audit_log", () => {
    mockCanViewAuditLog = false;
    render(<AuditLogPage />);

    expect(capturedQueryParams).toBeUndefined();
    expect(capturedMembersOptions).toEqual({ enabled: false });
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders audit log table with actor avatar, action badge, resource, and natural summary", () => {
    render(<AuditLogPage />);

    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("alice@haihire.local")).toBeInTheDocument();
    expect(screen.getAllByText("Permissions Updated").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText("Updated 1 permissions for role Recruiter"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Changed role of Tran Minh: Member → Recruiter"),
    ).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("supports multi-criteria filtering (resource, action, actor, date range) and resets filters", () => {
    render(<AuditLogPage />);

    fireEvent.click(screen.getByRole("button", { name: "Filter by resource" }));
    fireEvent.click(screen.getByRole("option", { name: "Invitation" }));
    expect(capturedQueryParams).toMatchObject({ resource: "INVITATION" });

    fireEvent.click(screen.getByRole("button", { name: "Filter by actor" }));
    fireEvent.click(
      screen.getByRole("option", {
        name: /alice@haihire\.local/,
      }),
    );
    expect(capturedQueryParams).toMatchObject({ actorId: "user-1" });

    fireEvent.click(screen.getByRole("button", { name: "Date range" }));
    fireEvent.click(screen.getByRole("option", { name: "Last 7 days" }));
    expect(capturedQueryParams).toMatchObject({
      from: expect.any(String),
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(capturedQueryParams).toMatchObject({
      resource: undefined,
      actorId: undefined,
      from: undefined,
    });
  });

  it("renders entity deep-link in Detail Drawer only for navigable non-deleted ATS entities", async () => {
    mockAuditLogData = {
      data: [
        {
          id: "log-job-1",
          organizationId: "org-1",
          actorId: "user-1",
          action: "JOB_STATUS_CHANGED",
          resource: "JOB",
          targetId: "job-42",
          targetLabel: "Lead Product Designer",
          changes: [{ field: "status", before: "PUBLISHED", after: "CLOSED" }],
          metadata: null,
          createdAt: "2026-10-23T12:00:00.000Z",
          actor: {
            id: "user-1",
            firstName: "Alice",
            lastName: "Admin",
            name: "Alice Admin",
            email: "alice@haihire.local",
            avatarUrl: null,
          },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };

    render(<AuditLogPage />);

    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    const dialog = await screen.findByRole("dialog");
    const openLink = within(dialog).getByRole("link", { name: "Open record" });
    expect(openLink).toHaveAttribute("href", "/jobs/job-42");
  });

  it("opens Detail Drawer with Before -> After diff, trace context, raw JSON toggle, and entity timeline filter", async () => {
    render(<AuditLogPage />);

    const inspectButtons = screen.getAllByRole("button", { name: "Inspect" });
    fireEvent.click(inspectButtons[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Audit Event Details")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Open record" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText("Create jobs")).toBeInTheDocument();
    expect(within(dialog).getByText("Revoked")).toBeInTheDocument();
    expect(within(dialog).getByText("Granted")).toBeInTheDocument();
    expect(within(dialog).getByText("203.0.113.10")).toBeInTheDocument();
    expect(within(dialog).getByText("Chrome · Windows")).toBeInTheDocument();
    expect(within(dialog).getByText("req-abc-123")).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Show raw JSON" }),
    );
    expect(
      within(dialog).getByLabelText("Raw JSON Payload"),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "View full entity timeline",
      }),
    );

    expect(capturedQueryParams).toMatchObject({
      targetId: "RECRUITER",
    });
    expect(
      screen.getByText(/Showing event timeline for target: Recruiter/),
    ).toBeInTheDocument();
  });

  it("exports filtered audit logs as CSV", async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:audit-csv");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    vi.mocked(organizationsApi.exportAuditLogs).mockResolvedValueOnce(
      new Blob(["id\nlog-1"], { type: "text/csv" }),
    );

    render(<AuditLogPage />);

    const exportTrigger = screen.getByRole("button", { name: "Export" });
    fireEvent.pointerDown(exportTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(exportTrigger);
    const exportCsvItem = await screen.findByRole("menuitem", {
      name: "Export CSV",
    });
    fireEvent.click(exportCsvItem);

    await waitFor(() => {
      expect(organizationsApi.exportAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        "csv",
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Audit log exported successfully.",
      );
    });

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it("paginates via Pagination controls and syncs URL query parameters", () => {
    mockSearchParamString = "action=ROLE_PERMISSIONS_UPDATED&page=2&limit=50";
    mockAuditLogData = {
      ...mockAuditLogData,
      total: 145,
    };

    render(<AuditLogPage />);

    expect(capturedQueryParams).toMatchObject({
      action: "ROLE_PERMISSIONS_UPDATED",
      limit: 50,
      offset: 50,
    });

    const trigger = screen.getByRole("button", { name: /Filter by action/i });
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole("option", { name: "Member Role Changed" }),
    );

    expect(window.location.search).toContain("action=MEMBER_ROLE_CHANGED");
    expect(window.location.search).not.toContain("page=");
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
