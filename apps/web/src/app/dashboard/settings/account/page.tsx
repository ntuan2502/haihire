"use client";

import { useContext, useMemo, useState } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import {
  canonicalizeTimezone,
  getTimezoneSelectOptions,
  normalizeOrgLocalization,
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
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { Lock, KeyRound, Loader2, Globe, User as UserIcon } from "lucide-react";

export default function AccountSettingsPage() {
  const { user, logout, setSession, updateUser } = useAuth();
  const { t, setLocale } = useI18n();
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const activePrefLang = prefLangDraft ?? user?.preferredLanguage ?? "";
  const rawPrefTimezone = prefTimezoneDraft ?? user?.preferredTimezone ?? "";
  const activePrefTimezone = rawPrefTimezone
    ? canonicalizeTimezone(rawPrefTimezone)
    : "";

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
      setLocale?.(payload.preferredLanguage ?? orgLocalization.defaultLanguage);
      toast.success(t("settings.accountPreferences.saveSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.accountPreferences.saveError"),
      );
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error(t("settings.currentPasswordRequiredError"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShortError"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatchError"));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authApi.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      if (res.accessToken) {
        setSession(res.accessToken, res.refreshToken, res.user);
      }
      toast.success(t("settings.passwordChangedSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "settings.changePasswordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.tabs.account")}
        subtitle={t("settings.accountProfileDesc")}
        icon={UserIcon}
        bordered
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column: Account Info + Change Password */}
        <div className="xl:col-span-7 space-y-5">
          {/* Account Info Card */}
          <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 min-w-0">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                <UserIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settings.tabs.accountSub")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      {field.label}
                    </label>
                    <Input
                      id={field.id}
                      type="text"
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-9 text-xs w-full"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label
                  htmlFor="account-email"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  {t("settings.emailAddress")}
                </label>
                <Input
                  id="account-email"
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-950 opacity-80 w-full"
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer rounded-xl"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      {t("settings.accountProfile.savingBtn")}
                    </>
                  ) : (
                    t("settings.accountProfile.saveBtn")
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={logout}
                  className="w-full sm:w-auto h-9 px-4 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 cursor-pointer rounded-xl"
                >
                  {t("nav.signOut")}
                </Button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 min-w-0">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settings.changePasswordTitle")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("settings.changePasswordSub")}
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("settings.currentPassword")}
                </label>
                <Input
                  type="password"
                  placeholder={t("settings.currentPasswordPlaceholder")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t("settings.newPassword")}
                  </label>
                  <Input
                    type="password"
                    placeholder={t("settings.newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t("settings.confirmNewPassword")}
                  </label>
                  <Input
                    type="password"
                    placeholder={t("settings.confirmNewPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 text-xs w-full"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{t("settings.updatingPassword")}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>{t("settings.updatePasswordBtn")}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Personal Language & Timezone Preferences Card */}
        <div className="xl:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5 min-w-0">
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("settings.accountPreferences.title")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("settings.accountPreferences.subtitle")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="account-preferred-language"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                triggerClassName="w-full h-9 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t("settings.accountPreferences.languageHint")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="account-preferred-timezone"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                triggerClassName="w-full h-9 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t("settings.accountPreferences.timezoneHint")}
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSavingPrefs}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-2"
              >
                {isSavingPrefs ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("settings.accountPreferences.savingBtn")}</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    <span>{t("settings.accountPreferences.saveBtn")}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
