"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_ORG_LOCALIZATION,
  isValidIanaTimezone,
  normalizeOrgLocalization,
  type OrganizationLocalizationSettings,
} from "@haihire/shared";
import { useAuth } from "@/context/auth-context";
import { useMyOrg } from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY } from "@/i18n/config";
import { resetActiveLocalization, setActiveLocalization } from "@/lib/utils";

interface LocalizationContextValue {
  localization: OrganizationLocalizationSettings;
  isConfigured: boolean;
}

const LocalizationContext = createContext<LocalizationContextValue>({
  localization: DEFAULT_ORG_LOCALIZATION,
  isConfigured: false,
});

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { locale, setLocale } = useI18n();
  const hasOrg = Boolean(user?.organizationId);
  const { data: myOrg } = useMyOrg({ enabled: hasOrg });
  const seededOrgLocaleRef = useRef<string | null>(null);
  const syncedUserPrefRef = useRef<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string>("");

  const activeOrg = myOrg ?? user?.organization ?? null;
  const orgLocalization = useMemo(
    () => normalizeOrgLocalization(activeOrg),
    [activeOrg],
  );

  const effectiveTimezone =
    user?.preferredTimezone && isValidIanaTimezone(user.preferredTimezone)
      ? user.preferredTimezone
      : orgLocalization.timezone;

  const localization = useMemo<OrganizationLocalizationSettings>(
    () => ({
      ...orgLocalization,
      timezone: effectiveTimezone,
    }),
    [orgLocalization, effectiveTimezone],
  );

  const syncKey =
    hasOrg && activeOrg
      ? `${activeOrg.id}:${localization.defaultLanguage}:${localization.timezone}:${localization.dateFormat}:${localization.timeFormat}:${localization.nameDisplayOrder}:${localization.defaultCurrency}:${locale}`
      : "none";

  // 2-tier language precedence: DB user.preferredLanguage -> localStorage/cookie -> org.defaultLanguage
  useEffect(() => {
    const userPrefLang = user?.preferredLanguage;
    if (user?.id && (userPrefLang === "vi" || userPrefLang === "en")) {
      const prefKey = `${user.id}:${userPrefLang}`;
      if (syncedUserPrefRef.current !== prefKey) {
        syncedUserPrefRef.current = prefKey;
        if (userPrefLang !== locale) {
          setLocale(userPrefLang);
        }
      }
      return;
    }

    syncedUserPrefRef.current = null;
    if (!hasOrg || !activeOrg || seededOrgLocaleRef.current === activeOrg.id) {
      return;
    }
    seededOrgLocaleRef.current = activeOrg.id;

    if (typeof window === "undefined") return;
    const savedStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const hasCookie = document.cookie
      .split(";")
      .some((part) => part.trim().startsWith(`${LOCALE_COOKIE_KEY}=`));
    if (
      !savedStorage &&
      !hasCookie &&
      localization.defaultLanguage !== locale
    ) {
      setLocale(localization.defaultLanguage);
    }
  }, [
    user?.id,
    user?.preferredLanguage,
    hasOrg,
    activeOrg,
    localization.defaultLanguage,
    locale,
    setLocale,
  ]);

  useEffect(() => {
    if (hasOrg && activeOrg) {
      setActiveLocalization(localization, locale);
    } else {
      resetActiveLocalization();
    }
    setAppliedKey(syncKey);
    return () => {
      resetActiveLocalization();
    };
  }, [hasOrg, activeOrg, localization, locale, syncKey]);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      localization,
      isConfigured: Boolean(hasOrg && activeOrg && appliedKey === syncKey),
    }),
    [localization, hasOrg, activeOrg, appliedKey, syncKey],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext);
}
