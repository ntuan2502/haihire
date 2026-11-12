"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  Banknote,
  Calendar,
  Clock,
  Eye,
  Globe,
  Languages,
  RotateCcw,
  Shield,
  UserCheck,
} from "lucide-react";
import {
  DEFAULT_ORG_LOCALIZATION,
  getTimezoneSelectOptions,
  normalizeOrgLocalization,
  SUPPORTED_CURRENCIES,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_NAME_DISPLAY_ORDERS,
  SUPPORTED_ORG_LANGUAGES,
  SUPPORTED_TIME_FORMATS,
  type CurrencyCode,
  type DateFormat,
  type NameDisplayOrder,
  type OrganizationLocalizationSettings,
  type OrgLanguage,
  type TimeFormat,
} from "@haihire/shared";
import { Button } from "@/components/ui/button";
import { CustomSelect, PageHeader } from "@/components/shared";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useMyOrg,
  useUpdateMyOrgMutation,
} from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatTime,
  getCandidateDisplayName,
} from "@/lib/utils";

const PREVIEW_DATE_ISO = "2026-08-27T12:00:00.000Z";
const PREVIEW_TIME = "14:30";
const PREVIEW_CANDIDATE = {
  firstName: "An",
  lastName: "Nguyễn Văn",
};

const PREVIEW_SALARY_AMOUNTS: Record<CurrencyCode, number> = {
  VND: 35_000_000,
  USD: 3_500,
  EUR: 3_200,
  SGD: 4_800,
  JPY: 520_000,
};

function settingsEqual(
  a: OrganizationLocalizationSettings,
  b: OrganizationLocalizationSettings,
): boolean {
  return (
    a.defaultLanguage === b.defaultLanguage &&
    a.timezone === b.timezone &&
    a.dateFormat === b.dateFormat &&
    a.timeFormat === b.timeFormat &&
    a.nameDisplayOrder === b.nameDisplayOrder &&
    a.defaultCurrency === b.defaultCurrency
  );
}

export default function LocalizationSettingsPage() {
  const { user, updateUser } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const canEdit = useHasPermission("org:update");

  const { data: myOrg, isLoading: isOrgLoading } = useMyOrg();
  const updateOrgMutation = useUpdateMyOrgMutation();

  const savedSettings = useMemo(
    () => normalizeOrgLocalization(myOrg ?? user?.organization),
    [myOrg, user?.organization],
  );

  const [draftOverride, setDraftOverride] =
    useState<OrganizationLocalizationSettings | null>(null);

  const draft = draftOverride ?? savedSettings;
  const isDirty = !settingsEqual(draft, savedSettings);

  const updateDraft = <K extends keyof OrganizationLocalizationSettings>(
    key: K,
    value: OrganizationLocalizationSettings[K],
  ) => {
    setDraftOverride((prev) => ({
      ...(prev ?? savedSettings),
      [key]: value,
    }));
  };

  const languageOptions = useMemo(
    () =>
      SUPPORTED_ORG_LANGUAGES.map((lang) => ({
        value: lang,
        label: t(`settings.localization.languages.${lang}`),
      })),
    [t],
  );

  const timezoneOptions = useMemo(
    () => getTimezoneSelectOptions(draft.timezone),
    [draft.timezone],
  );

  const handlePersonalLanguageChange = async (lang: OrgLanguage) => {
    setLocale(lang);
    if (!user) return;
    try {
      const updated = await authApi.updatePreferences({
        preferredLanguage: lang,
      });
      updateUser(updated);
    } catch {
      // Preserve immediate local language switch even if DB preference sync fails
    }
  };

  const currencyOptions = useMemo(() => {
    const getCurrencyLabel = (code: CurrencyCode) => {
      switch (code) {
        case "VND":
          return t("settings.localization.currencies.VND");
        case "USD":
          return t("settings.localization.currencies.USD");
        case "EUR":
          return t("settings.localization.currencies.EUR");
        case "SGD":
          return t("settings.localization.currencies.SGD");
        case "JPY":
          return t("settings.localization.currencies.JPY");
      }
    };

    return SUPPORTED_CURRENCIES.map((code) => ({
      value: code,
      label: getCurrencyLabel(code),
    }));
  }, [t]);

  const [previewRelativeDate] = useState(
    () => new Date(Date.now() - 5 * 60 * 1000),
  );

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit || !isDirty) return;

    try {
      await updateOrgMutation.mutateAsync(draft);
      setDraftOverride(null);
      toast.success(t("settings.localization.saveSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t, "settings.localization.saveError"),
      );
    }
  };

  const handleReset = () => {
    setDraftOverride(null);
  };

  const isDisabled = !canEdit || isOrgLoading || updateOrgMutation.isPending;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.localization.title")}
        subtitle={t("settings.localization.description")}
        icon={Globe}
        bordered
      />

      {/* Main Responsive 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          {/* CARD 1: Personal UI Language (All roles) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                <Languages className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settings.localization.personalCardTitle")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("settings.localization.personalCardSub")}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="personal-ui-language"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {t("settings.localization.personalLanguageLabel")}
              </label>
              <CustomSelect
                id="personal-ui-language"
                aria-label={t("settings.localization.personalLanguageLabel")}
                value={locale}
                onChange={(val) =>
                  void handlePersonalLanguageChange(val as OrgLanguage)
                }
                options={languageOptions}
                className="w-full"
                triggerClassName="w-full h-10 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t("settings.localization.personalLanguageHint")}
              </p>
            </div>
          </div>

          {/* CARD 2: Organization Regional Settings */}
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settings.localization.orgCardTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("settings.localization.orgCardSub")}
                </p>
              </div>
            </div>

            {!canEdit && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Shield className="h-4 w-4 shrink-0 text-slate-500" />
                <span>{t("settings.localization.adminOnlyHint")}</span>
              </div>
            )}

            {/* 1. Organization Default Language */}
            <div className="space-y-1.5">
              <label
                htmlFor="org-default-language"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {t("settings.localization.defaultLanguageLabel")}
              </label>
              <CustomSelect
                id="org-default-language"
                aria-label={t("settings.localization.defaultLanguageLabel")}
                value={draft.defaultLanguage}
                onChange={(val) =>
                  updateDraft("defaultLanguage", val as OrgLanguage)
                }
                disabled={isDisabled}
                options={languageOptions}
                className="w-full"
                triggerClassName="w-full h-10 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t("settings.localization.defaultLanguageHint")}
              </p>
            </div>

            {/* 2. Timezone */}
            <div className="space-y-1.5">
              <label
                htmlFor="org-timezone"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {t("settings.localization.timezoneLabel")}
              </label>
              <CustomSelect
                id="org-timezone"
                aria-label={t("settings.localization.timezoneLabel")}
                value={draft.timezone}
                onChange={(val) => updateDraft("timezone", val)}
                disabled={isDisabled}
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
                {t("settings.localization.timezoneHint")}
              </p>
            </div>

            {/* 3. Date Format */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t("settings.localization.dateFormatLabel")}
              </label>
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                role="radiogroup"
                aria-label={t("settings.localization.dateFormatLabel")}
              >
                {SUPPORTED_DATE_FORMATS.map((fmt) => {
                  const selected = draft.dateFormat === fmt;
                  const sample = formatDate(PREVIEW_DATE_ISO, "numeric", {
                    ...draft,
                    dateFormat: fmt,
                  });
                  return (
                    <button
                      key={fmt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isDisabled}
                      onClick={() =>
                        updateDraft("dateFormat", fmt as DateFormat)
                      }
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl border text-left transition-all",
                        isDisabled
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer",
                        selected
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-bold font-mono",
                          selected
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-slate-900 dark:text-white",
                        )}
                      >
                        {fmt}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {sample}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t("settings.localization.dateFormatHint")}
              </p>
            </div>

            {/* 4. Time Format */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t("settings.localization.timeFormatLabel")}
              </label>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                role="radiogroup"
                aria-label={t("settings.localization.timeFormatLabel")}
              >
                {SUPPORTED_TIME_FORMATS.map((fmt) => {
                  const selected = draft.timeFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isDisabled}
                      onClick={() =>
                        updateDraft("timeFormat", fmt as TimeFormat)
                      }
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl border text-left transition-all",
                        isDisabled
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer",
                        selected
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-bold",
                          selected
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-slate-900 dark:text-white",
                        )}
                      >
                        {fmt === "24H"
                          ? t("settings.localization.timeFormat24H")
                          : t("settings.localization.timeFormat12H")}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Candidate Name Display Order */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t("settings.localization.nameOrderLabel")}
              </label>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                role="radiogroup"
                aria-label={t("settings.localization.nameOrderLabel")}
              >
                {SUPPORTED_NAME_DISPLAY_ORDERS.map((order) => {
                  const selected = draft.nameDisplayOrder === order;
                  return (
                    <button
                      key={order}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isDisabled}
                      onClick={() =>
                        updateDraft(
                          "nameDisplayOrder",
                          order as NameDisplayOrder,
                        )
                      }
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl border text-left transition-all",
                        isDisabled
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer",
                        selected
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-bold",
                          selected
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-slate-900 dark:text-white",
                        )}
                      >
                        {order === "FIRST_LAST"
                          ? t("settings.localization.nameOrderFirstLast")
                          : t("settings.localization.nameOrderLastFirst")}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {order === "FIRST_LAST"
                          ? t("settings.localization.nameOrderFirstLastExample")
                          : t(
                              "settings.localization.nameOrderLastFirstExample",
                            )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Default Salary Currency */}
            <div className="space-y-1.5">
              <label
                htmlFor="org-default-currency"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {t("settings.localization.currencyLabel")}
              </label>
              <CustomSelect
                id="org-default-currency"
                value={draft.defaultCurrency}
                onChange={(val) =>
                  updateDraft(
                    "defaultCurrency",
                    (val ||
                      DEFAULT_ORG_LOCALIZATION.defaultCurrency) as CurrencyCode,
                  )
                }
                disabled={isDisabled}
                options={currencyOptions}
                className="w-full"
                triggerClassName="w-full h-10 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t("settings.localization.currencyHint")}
              </p>
            </div>

            {/* Action Row */}
            {canEdit && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {isDirty ? t("settings.localization.unsavedChanges") : ""}
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!isDirty || updateOrgMutation.isPending}
                    className="h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    {t("settings.localization.resetButton")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !isDirty || isOrgLoading || updateOrgMutation.isPending
                    }
                    className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {updateOrgMutation.isPending
                      ? t("common.loading")
                      : t("settings.saveChanges")}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* CARD 3: Live Format Preview */}
        <aside className="xl:col-span-5 xl:sticky xl:top-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-950/60 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("settings.localization.previewTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("settings.localization.previewSub")}
              </p>
            </div>
          </div>

          <div
            data-testid="localization-live-preview"
            className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60"
          >
            {/* Preview: Candidate Name */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <UserCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>{t("settings.localization.previewCandidateName")}</span>
              </div>
              <span
                data-testid="preview-candidate-name"
                className="text-xs font-bold text-slate-900 dark:text-white"
              >
                {getCandidateDisplayName(PREVIEW_CANDIDATE, draft)}
              </span>
            </div>

            {/* Preview: Date */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{t("settings.localization.previewDate")}</span>
              </div>
              <span
                data-testid="preview-date"
                className="text-xs font-bold font-mono text-slate-900 dark:text-white"
              >
                {formatDate(PREVIEW_DATE_ISO, "numeric", draft)}
              </span>
            </div>

            {/* Preview: Time */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{t("settings.localization.previewTime")}</span>
              </div>
              <span
                data-testid="preview-time"
                className="text-xs font-bold font-mono text-slate-900 dark:text-white"
              >
                {formatTime(PREVIEW_TIME, draft)}
              </span>
            </div>

            {/* Preview: Relative Time */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Languages className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span>{t("settings.localization.previewRelativeTime")}</span>
              </div>
              <span
                data-testid="preview-relative-time"
                className="text-xs font-bold text-slate-900 dark:text-white"
              >
                {formatRelativeTime(previewRelativeDate, draft)}
              </span>
            </div>

            {/* Preview: Salary */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Banknote className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{t("settings.localization.previewSalary")}</span>
              </div>
              <span
                data-testid="preview-salary"
                className="text-xs font-bold text-slate-900 dark:text-white"
              >
                {formatCurrency(
                  PREVIEW_SALARY_AMOUNTS[draft.defaultCurrency],
                  draft.defaultCurrency,
                  draft,
                )}
              </span>
            </div>

            {/* Preview: Timezone */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>{t("settings.localization.previewTimezone")}</span>
              </div>
              <span
                data-testid="preview-timezone"
                className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]"
              >
                {draft.timezone}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
