"use client";

import { useMemo, useState } from "react";
import {
  canonicalizeTimezone,
  getTimezoneSelectOptions,
  normalizeOrgLocalization,
  SUPPORTED_ORG_LANGUAGES,
  type OrgLanguage,
  type UpdateUserPreferencesPayload,
} from "@haihire/shared";
import { CustomSelect, PageHeader } from "@/components/shared";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  User as UserIcon,
} from "lucide-react";

export default function AccountSettingsPage() {
  const { user, logout, setSession, updateUser } = useAuth();
  const { t, setLocale } = useI18n();

  const orgLocalization = useMemo(
    () => normalizeOrgLocalization(user?.organization),
    [user?.organization],
  );

  const [prefLangDraft, setPrefLangDraft] = useState<string | null>(null);
  const [prefTimezoneDraft, setPrefTimezoneDraft] = useState<string | null>(
    null,
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefSuccessMsg, setPrefSuccessMsg] = useState<string | null>(null);
  const [prefErrorMsg, setPrefErrorMsg] = useState<string | null>(null);

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
    setPrefSuccessMsg(null);
    setPrefErrorMsg(null);
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
      setPrefSuccessMsg(t("settings.accountPreferences.saveSuccess"));
    } catch (err: unknown) {
      setPrefErrorMsg(
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword.trim()) {
      setErrorMsg(t("settings.currentPasswordRequiredError"));
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(t("settings.passwordTooShortError"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t("settings.passwordMismatchError"));
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
      setSuccessMsg(t("settings.passwordChangedSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, t, "settings.changePasswordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.tabs.account")}
        subtitle={t("settings.accountProfileDesc")}
        icon={UserIcon}
        bordered
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account Info + Change Password */}
        <div className="xl:col-span-7 space-y-6">
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

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("settings.yourName")}
                </label>
                <Input
                  type="text"
                  disabled
                  value={user?.name || "Admin User"}
                  className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("settings.emailAddress")}
                </label>
                <Input
                  type="email"
                  disabled
                  value={user?.email || "admin@example.com"}
                  className="h-10 text-xs bg-slate-50 dark:bg-slate-950 opacity-80 w-full"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={logout}
                className="w-full sm:w-auto h-9 px-4 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 cursor-pointer rounded-xl"
              >
                {t("nav.signOut")}
              </Button>
            </div>
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

            {successMsg && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

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
                  className="h-10 text-xs w-full"
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
                    className="h-10 text-xs w-full"
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
                    className="h-10 text-xs w-full"
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

          {prefSuccessMsg && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{prefSuccessMsg}</span>
            </div>
          )}

          {prefErrorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{prefErrorMsg}</span>
            </div>
          )}

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
                onChange={(val) => {
                  setPrefSuccessMsg(null);
                  setPrefErrorMsg(null);
                  setPrefLangDraft(val);
                }}
                disabled={isSavingPrefs}
                options={languageOptions}
                className="w-full"
                triggerClassName="w-full h-10 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
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
                onChange={(val) => {
                  setPrefSuccessMsg(null);
                  setPrefErrorMsg(null);
                  setPrefTimezoneDraft(val);
                }}
                disabled={isSavingPrefs}
                searchable
                searchPlaceholder={t(
                  "settings.localization.timezoneSearchPlaceholder",
                )}
                emptyText={t("settings.localization.timezoneNoMatch")}
                options={timezoneOptions}
                className="w-full"
                triggerClassName="w-full h-10 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
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
