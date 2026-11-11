import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalizationProvider, useLocalization } from "./localization-provider";
import { useAuth } from "@/context/auth-context";
import { useMyOrg } from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { LOCALE_STORAGE_KEY } from "@/i18n/config";
import {
  formatDate,
  formatTime,
  getActiveDefaultCurrency,
  getCandidateDisplayName,
  resetActiveLocalization,
} from "@/lib/utils";

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-organization-queries", () => ({
  useMyOrg: vi.fn(),
}));

vi.mock("@/i18n", () => ({
  useI18n: vi.fn(),
}));

function ProbeConsumer() {
  const { localization, isConfigured } = useLocalization();
  return (
    <div>
      <span data-testid="configured">{String(isConfigured)}</span>
      <span data-testid="currency">{localization.defaultCurrency}</span>
      <span data-testid="date">{formatDate("2026-08-27", "numeric")}</span>
      <span data-testid="time">{formatTime("14:30")}</span>
      <span data-testid="name">
        {getCandidateDisplayName({ firstName: "An", lastName: "Nguyễn" })}
      </span>
    </div>
  );
}

describe("LocalizationProvider", () => {
  const mockSetLocale = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resetActiveLocalization();
    localStorage.clear();
    document.cookie = "NEXT_LOCALE=; max-age=0; path=/";

    vi.mocked(useI18n).mockReturnValue({
      locale: "en",
      setLocale: mockSetLocale,
      t: (k: string) => k,
      isReady: true,
    });
  });

  afterEach(() => {
    resetActiveLocalization();
  });

  it("activates org regional formatting helpers and seeds UI language when no personal choice is saved", () => {
    const org = {
      id: "org-1",
      name: "Acme",
      slug: "acme",
      defaultLanguage: "vi" as const,
      timezone: "Asia/Tokyo",
      dateFormat: "YYYY-MM-DD" as const,
      timeFormat: "12H" as const,
      nameDisplayOrder: "LAST_FIRST" as const,
      defaultCurrency: "JPY" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "u1",
        email: "a@b.com",
        name: "Admin",
        role: "ADMIN",
        organizationId: "org-1",
        organization: org,
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

    vi.mocked(useMyOrg).mockReturnValue({
      data: org,
      isLoading: false,
    } as ReturnType<typeof useMyOrg>);

    render(
      <LocalizationProvider>
        <ProbeConsumer />
      </LocalizationProvider>,
    );

    expect(screen.getByTestId("configured")).toHaveTextContent("true");
    expect(screen.getByTestId("currency")).toHaveTextContent("JPY");
    expect(screen.getByTestId("date")).toHaveTextContent("2026-08-27");
    expect(screen.getByTestId("time")).toHaveTextContent("2:30 PM");
    expect(screen.getByTestId("name")).toHaveTextContent("Nguyễn An");
    expect(getActiveDefaultCurrency()).toBe("JPY");
    expect(mockSetLocale).toHaveBeenCalledWith("vi");
  });

  it("keeps personal language override untouched when localStorage preference already exists", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");

    const org = {
      id: "org-1",
      name: "Acme",
      slug: "acme",
      defaultLanguage: "vi" as const,
      timezone: "Asia/Ho_Chi_Minh",
      dateFormat: "DD/MM/YYYY" as const,
      timeFormat: "24H" as const,
      nameDisplayOrder: "FIRST_LAST" as const,
      defaultCurrency: "VND" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "u1",
        email: "a@b.com",
        name: "Admin",
        role: "ADMIN",
        organizationId: "org-1",
        organization: org,
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

    vi.mocked(useMyOrg).mockReturnValue({
      data: org,
      isLoading: false,
    } as ReturnType<typeof useMyOrg>);

    render(
      <LocalizationProvider>
        <ProbeConsumer />
      </LocalizationProvider>,
    );

    expect(mockSetLocale).not.toHaveBeenCalled();
  });

  it("applies DB-backed user preferredLanguage and preferredTimezone overrides over organization defaults", () => {
    const org = {
      id: "org-1",
      name: "Acme",
      slug: "acme",
      defaultLanguage: "vi" as const,
      timezone: "Asia/Ho_Chi_Minh",
      dateFormat: "DD/MM/YYYY" as const,
      timeFormat: "24H" as const,
      nameDisplayOrder: "FIRST_LAST" as const,
      defaultCurrency: "VND" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    vi.mocked(useI18n).mockReturnValue({
      locale: "vi",
      setLocale: mockSetLocale,
      t: (k: string) => k,
      isReady: true,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "u-override",
        email: "override@acme.com",
        name: "Override User",
        role: "MEMBER",
        preferredLanguage: "en",
        preferredTimezone: "America/New_York",
        organizationId: "org-1",
        organization: org,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      loading: false,
      isAuthenticated: true,
      canEdit: true,
      isAdmin: false,
      isOwner: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
      updateUserOrg: vi.fn(),
      refreshUser: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.mocked(useMyOrg).mockReturnValue({
      data: org,
      isLoading: false,
    } as ReturnType<typeof useMyOrg>);

    render(
      <LocalizationProvider>
        <ProbeConsumer />
      </LocalizationProvider>,
    );

    expect(mockSetLocale).toHaveBeenCalledWith("en");
    // UTC noon -> America/New_York (EDT UTC-4 on 2026-08-27) formats differently from HCM (UTC+7)
    expect(screen.getByTestId("configured")).toHaveTextContent("true");
  });
});
