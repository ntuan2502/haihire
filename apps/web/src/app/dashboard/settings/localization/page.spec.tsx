import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LocalizationSettingsPage from "./page";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useMyOrg,
  useUpdateMyOrgMutation,
} from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    updatePreferences: vi.fn(),
  },
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: vi.fn(),
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrg: vi.fn(),
  useUpdateMyOrgMutation: vi.fn(),
}));

vi.mock("@/i18n", () => ({
  useI18n: vi.fn(),
}));

describe("LocalizationSettingsPage", () => {
  const mockMutateAsync = vi.fn();
  const mockSetLocale = vi.fn();

  const defaultOrg = {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme",
    defaultLanguage: "vi" as const,
    timezone: "Asia/Ho_Chi_Minh",
    dateFormat: "DD/MM/YYYY" as const,
    timeFormat: "24H" as const,
    nameDisplayOrder: "FIRST_LAST" as const,
    defaultCurrency: "VND" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useI18n).mockReturnValue({
      locale: "vi",
      setLocale: mockSetLocale,
      t: (key: string) => key,
      isReady: true,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user-1",
        email: "admin@acme.com",
        name: "Admin",
        role: "ADMIN",
        isOwner: true,
        organizationId: "org-1",
        organization: defaultOrg,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      loading: false,
      isAuthenticated: true,
      canEdit: true,
      isAdmin: true,
      isOwner: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
      updateUserOrg: vi.fn(),
      refreshUser: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.mocked(useHasPermission).mockReturnValue(true);

    vi.mocked(useMyOrg).mockReturnValue({
      data: defaultOrg,
      isLoading: false,
    } as ReturnType<typeof useMyOrg>);

    vi.mocked(useUpdateMyOrgMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateMyOrgMutation>);
  });

  it("renders personal language, regional settings, and live preview with current org defaults", () => {
    render(<LocalizationSettingsPage />);

    expect(screen.getByText("settings.localization.title")).toBeInTheDocument();
    expect(screen.getByTestId("preview-candidate-name")).toHaveTextContent(
      "An Nguyễn Văn",
    );
    expect(screen.getByTestId("preview-date")).toHaveTextContent("27/08/2026");
    expect(screen.getByTestId("preview-time")).toHaveTextContent("14:30");
    expect(screen.getByTestId("preview-timezone")).toHaveTextContent(
      "Asia/Ho_Chi_Minh",
    );
  });

  it("updates live preview immediately and saves regional changes for admins", async () => {
    mockMutateAsync.mockResolvedValueOnce({
      ...defaultOrg,
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12H",
      nameDisplayOrder: "LAST_FIRST",
    });

    render(<LocalizationSettingsPage />);

    // Switch Date Format to MM/DD/YYYY
    fireEvent.click(screen.getByRole("radio", { name: /MM\/DD\/YYYY/i }));
    // Switch Time Format to 12H
    fireEvent.click(
      screen.getByRole("radio", {
        name: "settings.localization.timeFormat12H",
      }),
    );
    // Switch Candidate Name Order to LAST_FIRST
    fireEvent.click(
      screen.getByRole("radio", {
        name: /settings\.localization\.nameOrderLastFirst/i,
      }),
    );

    // Verify Live Preview reflects draft BEFORE clicking Save
    expect(screen.getByTestId("preview-candidate-name")).toHaveTextContent(
      "Nguyễn Văn An",
    );
    expect(screen.getByTestId("preview-date")).toHaveTextContent("08/27/2026");
    expect(screen.getByTestId("preview-time")).toHaveTextContent("2:30 PM");

    // Submit form
    fireEvent.click(
      screen.getByRole("button", { name: "settings.saveChanges" }),
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        defaultLanguage: "vi",
        timezone: "Asia/Ho_Chi_Minh",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12H",
        nameDisplayOrder: "LAST_FIRST",
        defaultCurrency: "VND",
      });
    });

    expect(
      await screen.findByText("settings.localization.saveSuccess"),
    ).toBeInTheDocument();
  });

  it("switches personal UI language via dropdown list for any user and syncs preference", async () => {
    vi.mocked(useHasPermission).mockReturnValue(false);
    vi.mocked(authApi.updatePreferences).mockResolvedValueOnce({
      id: "user-1",
      email: "admin@acme.com",
      name: "Admin",
      role: "ADMIN",
      preferredLanguage: "en",
      organizationId: "org-1",
      organization: defaultOrg,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    render(<LocalizationSettingsPage />);

    // Read-only admin hint shown and Save button omitted for non-admins
    expect(
      screen.getByText("settings.localization.adminOnlyHint"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "settings.saveChanges" }),
    ).not.toBeInTheDocument();

    // Personal language switch renders as searchable/scrollable list dropdown
    const trigger = screen.getByRole("button", {
      name: "settings.localization.personalLanguageLabel",
    });
    fireEvent.click(trigger);

    const englishOption = screen.getByRole("option", {
      name: "settings.localization.languages.en",
    });
    fireEvent.click(englishOption);

    expect(mockSetLocale).toHaveBeenCalledWith("en");
    await waitFor(() => {
      expect(authApi.updatePreferences).toHaveBeenCalledWith({
        preferredLanguage: "en",
      });
    });
  });

  it("searches across full sorted timezone catalog in org settings", () => {
    render(<LocalizationSettingsPage />);

    const tzTrigger = screen.getByRole("button", {
      name: "settings.localization.timezoneLabel",
    });
    fireEvent.click(tzTrigger);

    const searchInput = screen.getByPlaceholderText(
      "settings.localization.timezoneSearchPlaceholder",
    );
    fireEvent.change(searchInput, { target: { value: "Tokyo" } });

    const option = screen.getByRole("option", {
      name: /Osaka, Sapporo, Tokyo/i,
    });
    fireEvent.click(option);

    expect(screen.getByTestId("preview-timezone")).toHaveTextContent(
      "Asia/Tokyo",
    );
  });

  it("resets unsaved draft changes back to saved organization defaults", () => {
    render(<LocalizationSettingsPage />);

    fireEvent.click(screen.getByRole("radio", { name: /YYYY-MM-DD/i }));
    expect(screen.getByTestId("preview-date")).toHaveTextContent("2026-08-27");

    fireEvent.click(
      screen.getByRole("button", { name: "settings.localization.resetButton" }),
    );

    expect(screen.getByTestId("preview-date")).toHaveTextContent("27/08/2026");
  });
});
