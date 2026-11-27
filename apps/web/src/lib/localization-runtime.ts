import {
  DEFAULT_ORG_LOCALIZATION,
  normalizeOrgLocalization,
  type CurrencyCode,
  type OrgLanguage,
  type OrganizationLocalizationSettings,
} from "@haihire/shared";

export type LocalizationOverrides = Partial<OrganizationLocalizationSettings>;

let activeOrgLocalization: OrganizationLocalizationSettings | null = null;
let activeUiLocale: OrgLanguage | null = null;

/**
 * Activate runtime organization formatting preferences for utilities across the app.
 */
export function setActiveLocalization(
  orgSettings?: Partial<OrganizationLocalizationSettings> | null,
  uiLocale?: OrgLanguage | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  activeOrgLocalization = orgSettings
    ? normalizeOrgLocalization(orgSettings)
    : null;
  activeUiLocale = uiLocale ?? activeOrgLocalization?.defaultLanguage ?? null;
}

/**
 * Reset active runtime formatting preferences back to stateless test/default fallbacks.
 */
export function resetActiveLocalization(): void {
  activeOrgLocalization = null;
  activeUiLocale = null;
}

export function isRuntimeLocalizationActive(): boolean {
  return activeOrgLocalization !== null;
}

export function getActiveLocalization(): OrganizationLocalizationSettings {
  return activeOrgLocalization ?? { ...DEFAULT_ORG_LOCALIZATION };
}

export function getActiveLocalizationNullable(): OrganizationLocalizationSettings | null {
  return activeOrgLocalization;
}

export function getActiveUiLocale(): OrgLanguage | null {
  return activeUiLocale;
}

/**
 * Resolve the effective IANA timezone from LocalizationProvider state with
 * stateless runtime/default fallback so hooks behave identically in tests.
 */
export function resolveEffectiveTimezone(
  configuredTimezone?: string | null,
  isConfigured = false,
): string {
  if (isConfigured && configuredTimezone) return configuredTimezone;
  if (isRuntimeLocalizationActive()) {
    return getActiveLocalization().timezone;
  }
  return (
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    DEFAULT_ORG_LOCALIZATION.timezone
  );
}

export function getActiveDefaultCurrency(): CurrencyCode | null {
  return activeOrgLocalization ? activeOrgLocalization.defaultCurrency : null;
}
