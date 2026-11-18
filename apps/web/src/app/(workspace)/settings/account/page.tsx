"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { useContext, useMemo, useState } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import {
  canonicalizeTimezone,
  getTimezoneSelectOptions,
  normalizeOrgLocalization,
  isValidIanaTimezone,
  splitFullName,
  SUPPORTED_ORG_LANGUAGES,
  type OrgLanguage,
  type UpdateUserPreferencesPayload,
  type UpdateUserProfilePayload,
} from "@haihire/shared";
import { CustomSelect, PageHeader } from "@/components/shared";
import { useAuth } from "@/context/auth-context";
import { queryKeys } from "@/hooks/query-keys";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY } from "@/i18n/config";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { Save, Globe, User as UserIcon } from "lucide-react";
import { AccountPasswordCard } from "@/components/settings/account/account-password-card";

export default function AccountSettingsPage() {
  const { user, logout, setSession, updateUser } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const queryClient = useContext(QueryClientContext) ?? null;

  const orgLocalization = useMemo(
    () => normalizeOrgLocalization(user?.organization),
    [user?.organization],
  );
  const isLastFirst = orgLocalization.nameDisplayOrder === "LAST_FIRST";

  const fallbackParts = useMemo(() => splitFullName(user?.name), [user?.name]);
  const resolvedFirstName = user?.firstName ?? fallbackParts.firstName;
  const resolvedLastName = user?.lastName ?? fallbackParts.lastName;

  const [firstNameDraft, setFirstNameDraft] = useState<string | null>(null);
  const [lastNameDraft, setLastNameDraft] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const activeFirstName = firstNameDraft ?? resolvedFirstName;
  const activeLastName = lastNameDraft ?? resolvedLastName;

  const hasProfileChanges =
    activeFirstName.trim() !== resolvedFirstName.trim() ||
    activeLastName.trim() !== resolvedLastName.trim();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasProfileChanges || isSavingProfile) return;

    const trimmedFirst = activeFirstName.trim();
    const trimmedLast = activeLastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      toast.error(t("settings.accountProfile.nameRequiredError"));
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload: UpdateUserProfilePayload = {
        firstName: trimmedFirst,
        lastName: trimmedLast,
      };
      const updatedUser = await authApi.updateProfile(payload);
      updateUser?.(updatedUser);
      setFirstNameDraft(null);
      setLastNameDraft(null);
      queryClient?.invalidateQueries({ queryKey: queryKeys.orgMembers() });
      queryClient?.invalidateQueries({
        queryKey: queryKeys.orgInterviewers(),
      });
      queryClient?.invalidateQueries({ queryKey: queryKeys.inviteLinks() });
      queryClient?.invalidateQueries({
        queryKey: ["organization", "audit-logs"],
      });
      toast.success(t("settings.accountProfile.saveSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.accountProfile.saveError"),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [prefLangDraft, setPrefLangDraft] = useState<string | null>(null);
  const [prefTimezoneDraft, setPrefTimezoneDraft] = useState<string | null>(
    null,
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const savedLanguage = user?.preferredLanguage ?? "";
  const savedTimezone = user?.preferredTimezone
    ? canonicalizeTimezone(user.preferredTimezone)
    : "";
  const activePrefLang = prefLangDraft ?? savedLanguage;
  const rawPrefTimezone = prefTimezoneDraft ?? savedTimezone;
  const activePrefTimezone = rawPrefTimezone
    ? canonicalizeTimezone(rawPrefTimezone)
    : "";

  const hasPreferenceChanges =
    activePrefLang !== savedLanguage || activePrefTimezone !== savedTimezone;
  const usesPersonalTimezone = Boolean(
    savedTimezone && isValidIanaTimezone(savedTimezone),
  );
  const effectiveTimezone = usesPersonalTimezone
    ? savedTimezone
    : orgLocalization.timezone;

  const languageOptions = useMemo(() => {
    const orgLangLabel = t(
      `settings.localization.languages.${orgLocalization.defaultLanguage}`,
    );
    return [
      {
        value: "",
        label: `${t("settings.accountPreferences.followOrgDefault")} (${orgLangLabel})`,
      },
      ...SUPPORTED_ORG_LANGUAGES.map((lang) => ({
        value: lang,
        label: t(`settings.localization.languages.${lang}`),
      })),
    ];
  }, [orgLocalization.defaultLanguage, t]);

  const timezoneOptions = useMemo(() => {
    const allZones = getTimezoneSelectOptions(activePrefTimezone || null);
    const orgTzEntry = allZones.find(
      (opt) => opt.value === orgLocalization.timezone,
    );
    const orgTzLabel = orgTzEntry ? orgTzEntry.label : orgLocalization.timezone;
    return [
      {
        value: "",
        label: `${t("settings.accountPreferences.followOrgDefault")} (${orgTzLabel})`,
      },
      ...allZones,
    ];
  }, [activePrefTimezone, orgLocalization.timezone, t]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPreferenceChanges || isSavingPrefs) return;
    setIsSavingPrefs(true);
    try {
      const payload: UpdateUserPreferencesPayload = {
        preferredLanguage:
          activePrefLang === "" ? null : (activePrefLang as OrgLanguage),
        preferredTimezone:
          activePrefTimezone === "" ? null : activePrefTimezone,
      };
      const updatedUser = await authApi.updatePreferences(payload);
      updateUser?.(updatedUser);
      setPrefLangDraft(null);
      setPrefTimezoneDraft(null);
      if (payload.preferredLanguage) {
        await setLocale(payload.preferredLanguage as "vi" | "en");
      } else {
        await setLocale(orgLocalization.defaultLanguage as "vi" | "en");
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(LOCALE_STORAGE_KEY);
            document.cookie = `${LOCALE_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
          } catch {
            // Best-effort cleanup so account follows future org default language updates
          }
        }
      }
      toast.success(t("settings.accountPreferences.saveSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.accountPreferences.saveError"),
      );
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="flex-1 w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.tabs.account")}
        subtitle={t("settings.accountProfileDesc")}
        icon={UserIcon}
        bordered
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account Profile + Security Cards */}
        <div className="xl:col-span-7 space-y-6 min-w-0">
          {/* Personal Information Card */}
          <SettingsCard className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
                <UserIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("settings.tabs.accountSub")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.accountInfoSub")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isLastFirst
                  ? [
                      {
                        id: "account-last-name",
                        label: t("settings.accountProfile.lastNameLabel"),
                        placeholder: t(
                          "settings.accountProfile.lastNamePlaceholder",
                        ),
                        value: activeLastName,
                        onChange: (val: string) => setLastNameDraft(val),
                      },
                      {
                        id: "account-first-name",
                        label: t("settings.accountProfile.firstNameLabel"),
                        placeholder: t(
                          "settings.accountProfile.firstNamePlaceholder",
                        ),
                        value: activeFirstName,
                        onChange: (val: string) => setFirstNameDraft(val),
                      },
                    ]
                  : [
                      {
                        id: "account-first-name",
                        label: t("settings.accountProfile.firstNameLabel"),
                        placeholder: t(
                          "settings.accountProfile.firstNamePlaceholder",
                        ),
                        value: activeFirstName,
                        onChange: (val: string) => setFirstNameDraft(val),
                      },
                      {
                        id: "account-last-name",
                        label: t("settings.accountProfile.lastNameLabel"),
                        placeholder: t(
                          "settings.accountProfile.lastNamePlaceholder",
                        ),
                        value: activeLastName,
                        onChange: (val: string) => setLastNameDraft(val),
                      },
                    ]
                ).map((field) => (
                  <div key={field.id}>
                    <label
                      htmlFor={field.id}
                      className="block text-xs font-medium text-foreground mb-1.5"
                    >
                      {field.label}
                    </label>
                    <Input
                      id={field.id}
                      type="text"
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="text-xs w-full"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label
                  htmlFor="account-email"
                  className="block text-xs font-medium text-foreground mb-1.5"
                >
                  {t("settings.emailAddress")}
                </label>
                <Input
                  id="account-email"
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="text-xs bg-muted/40 w-full"
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                <SettingsButton
                  type="submit"
                  disabled={!hasProfileChanges}
                  icon={Save}
                  pending={isSavingProfile}
                >
                  {t(
                    isSavingProfile
                      ? "settings.accountProfile.savingBtn"
                      : "settings.accountProfile.saveBtn",
                  )}
                </SettingsButton>

                <SettingsButton
                  type="button"
                  variant="destructive"
                  onClick={logout}
                  className="w-full sm:w-auto"
                >
                  {t("nav.signOut")}
                </SettingsButton>
              </div>
            </form>
          </SettingsCard>

          {/* Change Password Card */}
          <AccountPasswordCard setSession={setSession} />
        </div>

        {/* Right Column: Personal Language & Timezone Preferences Card */}
        <SettingsCard className="xl:col-span-5 space-y-5">
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("settings.accountPreferences.title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.accountPreferences.subtitle")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="account-preferred-language"
                className="block text-xs font-medium text-foreground"
              >
                {t("settings.accountPreferences.languageLabel")}
              </label>
              <CustomSelect
                id="account-preferred-language"
                aria-label={t("settings.accountPreferences.languageLabel")}
                value={activePrefLang}
                onChange={(val) => setPrefLangDraft(val)}
                disabled={isSavingPrefs}
                options={languageOptions}
                className="w-full"
                triggerClassName="w-full text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("settings.accountPreferences.languageHint")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.accountPreferences.currentLanguage", {
                  value: t(
                    `settings.localization.languages.${locale ?? orgLocalization.defaultLanguage}`,
                  ),
                })}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="account-preferred-timezone"
                className="block text-xs font-medium text-foreground"
              >
                {t("settings.accountPreferences.timezoneLabel")}
              </label>
              <CustomSelect
                id="account-preferred-timezone"
                aria-label={t("settings.accountPreferences.timezoneLabel")}
                value={activePrefTimezone}
                onChange={(val) => setPrefTimezoneDraft(val)}
                disabled={isSavingPrefs}
                searchable
                searchPlaceholder={t(
                  "settings.localization.timezoneSearchPlaceholder",
                )}
                emptyText={t("settings.localization.timezoneNoMatch")}
                options={timezoneOptions}
                className="w-full"
                triggerClassName="w-full text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("settings.accountPreferences.timezoneHint")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.accountPreferences.currentTimezone", {
                  value: effectiveTimezone,
                  source: t(
                    usesPersonalTimezone
                      ? "settings.accountPreferences.personalSource"
                      : "settings.accountPreferences.followOrgDefault",
                  ),
                })}
              </p>
            </div>

            <div className="pt-2">
              <SettingsButton
                type="submit"
                disabled={!hasPreferenceChanges}
                icon={Save}
                pending={isSavingPrefs}
              >
                {t(
                  isSavingPrefs
                    ? "settings.accountPreferences.savingBtn"
                    : "settings.accountPreferences.saveBtn",
                )}
              </SettingsButton>
            </div>
          </form>
        </SettingsCard>
      </div>
    </div>
  );
}
