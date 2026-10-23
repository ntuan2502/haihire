import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RolesPermissionsSettingsPage from "./page";
import { Role } from "@haihire/shared";

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

let mockCanManageRoles = true;
vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanManageRoles,
}));

const mockUpdateRolePermissionsMutateAsync = vi.fn();
let mockMatrixLoading = false;
let mockMatrixError: Error | null = null;
let mockMatrixData: Record<Role, Record<string, boolean>> = {
  ADMIN: {
    "org:view": true,
    "org:update": true,
    "org:delete": true,
    "org:manage_members": true,
    "org:manage_roles": true,
    "org:manage_billing": true,
    "org:transfer_ownership": true,
    "job:view": true,
    "job:create": true,
    "job:update": true,
    "job:delete": true,
    "candidate:view": true,
  },
  RECRUITER: {
    "job:view": true,
    "job:create": true,
    "candidate:view": true,
    "job:delete": false,
  },
  HIRING_MANAGER: {
    "job:view": true,
    "candidate:view": true,
  },
  INTERVIEWER: {
    "candidate:view": true,
  },
  MEMBER: {},
};

vi.mock("@/hooks/use-queries", () => ({
  useRolePermissionsMatrix: () => ({
    data: mockMatrixData,
    isLoading: mockMatrixLoading,
    isError: Boolean(mockMatrixError),
    error: mockMatrixError,
    refetch: vi.fn(),
  }),
  useUpdateRolePermissionsMutation: () => ({
    mutateAsync: mockUpdateRolePermissionsMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "settings.rolesMatrix.title": "Role & Permissions Matrix",
        "settings.rolesMatrix.subtitle":
          "Configure fine-grained permissions per role for your organization.",
        "settings.rolesMatrix.tableSummary":
          "Matrix of roles and permissions in this organization",
        "settings.rolesMatrix.permissionColumn": "Permission",
        "settings.rolesMatrix.saveButton": "Save Changes",
        "settings.rolesMatrix.savingButton": "Saving...",
        "settings.rolesMatrix.resetButton": "Reset",
        "settings.rolesMatrix.saveSuccess": "Permissions updated successfully.",
        "settings.rolesMatrix.saveError": "Failed to update permissions.",
        "settings.rolesMatrix.unsavedChanges": "unsaved changes",
        "settings.rolesMatrix.readOnlyNotice":
          "You are viewing the permission matrix in read-only mode.",
        "settings.rolesMatrix.coreAdminProtected":
          "Core administrative permissions cannot be revoked from the Admin role.",
        "settings.rolesMatrix.adminRoleImmutable":
          "Admin role permissions are immutable and cannot be modified.",
        "settings.rolesMatrix.roleAdmin": "Admin",
        "settings.rolesMatrix.roleRecruiter": "Recruiter",
        "settings.rolesMatrix.roleHiringManager": "Hiring Manager",
        "settings.rolesMatrix.roleInterviewer": "Interviewer",
        "settings.rolesMatrix.roleMember": "Member",
        "settings.rolesMatrix.categoryOrg": "Organization Management",
        "settings.rolesMatrix.categoryJob": "Job Management",
        "settings.rolesMatrix.categoryCandidate": "Candidate Pipeline",
        "settings.rolesMatrix.categoryApplication": "Applications",
        "settings.rolesMatrix.categoryInterview": "Interviews",
        "settings.rolesMatrix.categorySourcing": "Talent Sourcing",
        "settings.rolesMatrix.categoryEmail": "Email & Communication",
        "settings.rolesMatrix.categorySettings": "Settings & Audit",
      };
      return dict[key] || key;
    },
  }),
}));

describe("RolesPermissionsSettingsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanManageRoles = true;
    mockMatrixLoading = false;
    mockMatrixError = null;
    mockMatrixData = {
      ADMIN: {
        "org:view": true,
        "org:update": true,
        "org:delete": true,
        "org:manage_members": true,
        "org:manage_roles": true,
        "org:manage_billing": true,
        "org:transfer_ownership": true,
        "job:view": true,
        "job:create": true,
        "job:update": true,
        "job:delete": true,
        "candidate:view": true,
      },
      RECRUITER: {
        "job:view": true,
        "job:create": true,
        "candidate:view": true,
        "job:delete": false,
      },
      HIRING_MANAGER: {
        "job:view": true,
        "candidate:view": true,
      },
      INTERVIEWER: {
        "candidate:view": true,
      },
      MEMBER: {},
    };
  });

  it("renders table with 5 role columns and permission groups", () => {
    render(<RolesPermissionsSettingsPage />);

    expect(screen.getByText("Role & Permissions Matrix")).toBeInTheDocument();
    expect(
      screen.getByRole("table", {
        name: "Matrix of roles and permissions in this organization",
      }),
    ).toBeInTheDocument();

    // 5 role headers
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
    expect(screen.getByText("Hiring Manager")).toBeInTheDocument();
    expect(screen.getByText("Interviewer")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();

    // Category section headers
    expect(screen.getByText("Organization Management")).toBeInTheDocument();
    expect(screen.getByText("Job Management")).toBeInTheDocument();
    expect(screen.getByText("Candidate Pipeline")).toBeInTheDocument();
  });

  it("disables all admin permissions checkboxes unconditionally", () => {
    render(<RolesPermissionsSettingsPage />);

    const adminManageRolesCheckbox = screen.getByRole("checkbox", {
      name: "Admin: org:manage_roles",
    });
    expect(adminManageRolesCheckbox).toBeDisabled();
    expect(adminManageRolesCheckbox).toBeChecked();

    const adminDeleteCheckbox = screen.getByRole("checkbox", {
      name: "Admin: org:delete",
    });
    expect(adminDeleteCheckbox).toBeDisabled();
    expect(adminDeleteCheckbox).toBeChecked();

    const adminJobViewCheckbox = screen.getByRole("checkbox", {
      name: "Admin: job:view",
    });
    expect(adminJobViewCheckbox).toBeDisabled();
    expect(adminJobViewCheckbox).toBeChecked();
  });

  it("ADMIN column renders all checkboxes checked and disabled", () => {
    render(<RolesPermissionsSettingsPage />);

    const adminCheckboxes = screen
      .getAllByRole("checkbox")
      .filter((cb) => cb.getAttribute("aria-label")?.startsWith("Admin:"));
    expect(adminCheckboxes.length).toBeGreaterThan(0);
    for (const cb of adminCheckboxes) {
      expect(cb).toBeChecked();
      expect(cb).toBeDisabled();
    }
  });

  it("clicking ADMIN checkbox does NOT toggle state or trigger dirty", () => {
    render(<RolesPermissionsSettingsPage />);

    const adminOrgView = screen.getByRole("checkbox", {
      name: "Admin: org:view",
    });
    expect(adminOrgView).toBeChecked();

    fireEvent.click(adminOrgView);

    expect(adminOrgView).toBeChecked();
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("save button does NOT send ADMIN overrides even if other roles modified", async () => {
    mockUpdateRolePermissionsMutateAsync.mockResolvedValueOnce({
      role: Role.RECRUITER,
      permissions: { "job:delete": true },
    });

    render(<RolesPermissionsSettingsPage />);

    const adminOrgView = screen.getByRole("checkbox", {
      name: "Admin: org:view",
    });
    fireEvent.click(adminOrgView);

    const recruiterJobDelete = screen.getByRole("checkbox", {
      name: "Recruiter: job:delete",
    });
    fireEvent.click(recruiterJobDelete);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateRolePermissionsMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockUpdateRolePermissionsMutateAsync).toHaveBeenCalledWith({
        role: Role.RECRUITER,
        permissions: [
          {
            permission: "job:delete",
            granted: true,
          },
        ],
      });
    });
  });

  it("shows lock icon and immutable tooltip on ADMIN column header and cells", () => {
    render(<RolesPermissionsSettingsPage />);

    // Header and cell lock tooltips
    const elementsWithLockTooltip = screen.getAllByTitle(
      "Admin role permissions are immutable and cannot be modified.",
    );
    expect(elementsWithLockTooltip.length).toBeGreaterThan(1);

    // Check cells title attribute
    const adminOrgView = screen.getByRole("checkbox", {
      name: "Admin: org:view",
    });
    expect(adminOrgView).toHaveAttribute(
      "title",
      "Admin role permissions are immutable and cannot be modified.",
    );
  });

  it("toggles checkbox and activates dirty state banner with Save button", () => {
    render(<RolesPermissionsSettingsPage />);

    // Save button should initially be disabled because dirtyCount is 0
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).toBeDisabled();
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();

    // Toggle a non-core permission for RECRUITER (e.g., job:delete)
    const recruiterJobDelete = screen.getByRole("checkbox", {
      name: "Recruiter: job:delete",
    });
    expect(recruiterJobDelete).not.toBeChecked();

    fireEvent.click(recruiterJobDelete);

    expect(recruiterJobDelete).toBeChecked();
    expect(saveButton).not.toBeDisabled();
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it("rolls back to initial state when clicking Reset button", () => {
    render(<RolesPermissionsSettingsPage />);

    const recruiterJobDelete = screen.getByRole("checkbox", {
      name: "Recruiter: job:delete",
    });
    expect(recruiterJobDelete).not.toBeChecked();

    fireEvent.click(recruiterJobDelete);
    expect(recruiterJobDelete).toBeChecked();

    const resetButton = screen.getByRole("button", { name: "Reset" });
    fireEvent.click(resetButton);

    expect(recruiterJobDelete).not.toBeChecked();
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).toBeDisabled();
  });

  it("calls API update with correct payload when clicking Save", async () => {
    mockUpdateRolePermissionsMutateAsync.mockResolvedValueOnce({
      role: Role.RECRUITER,
      permissions: { "job:delete": true },
    });

    render(<RolesPermissionsSettingsPage />);

    const recruiterJobDelete = screen.getByRole("checkbox", {
      name: "Recruiter: job:delete",
    });
    fireEvent.click(recruiterJobDelete);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateRolePermissionsMutateAsync).toHaveBeenCalledWith({
        role: Role.RECRUITER,
        permissions: [
          {
            permission: "job:delete",
            granted: true,
          },
        ],
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Permissions updated successfully.",
      );
    });
  });

  it("handles error state and shows error toast when API fails", async () => {
    mockUpdateRolePermissionsMutateAsync.mockRejectedValueOnce(
      new Error("Failed to update permissions."),
    );

    render(<RolesPermissionsSettingsPage />);

    const recruiterJobDelete = screen.getByRole("checkbox", {
      name: "Recruiter: job:delete",
    });
    fireEvent.click(recruiterJobDelete);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Failed to update permissions.",
      );
    });
  });

  it("locks all checkboxes and shows read-only notice when user lacks org:manage_roles", () => {
    mockCanManageRoles = false;
    render(<RolesPermissionsSettingsPage />);

    expect(
      screen.getByText(
        "You are viewing the permission matrix in read-only mode.",
      ),
    ).toBeInTheDocument();

    // Checkboxes should all be disabled
    const recruiterJobView = screen.getByRole("checkbox", {
      name: "Recruiter: job:view",
    });
    expect(recruiterJobView).toBeDisabled();

    // Action buttons (Save/Reset) are not rendered in read-only mode
    expect(
      screen.queryByRole("button", { name: "Save Changes" }),
    ).not.toBeInTheDocument();
  });

  it("renders loading skeleton while fetching data", () => {
    mockMatrixLoading = true;
    render(<RolesPermissionsSettingsPage />);

    expect(
      screen.queryByRole("table", {
        name: "Matrix of roles and permissions in this organization",
      }),
    ).not.toBeInTheDocument();
  });
});
