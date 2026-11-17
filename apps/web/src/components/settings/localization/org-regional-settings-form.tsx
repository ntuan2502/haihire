"use client";

import { Save } from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import type { FormEvent } from "react";
import { Globe, RotateCcw, Shield } from "lucide-react";
import {
  DEFAULT_ORG_LOCALIZATION,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_NAME_DISPLAY_ORDERS,
  SUPPORTED_TIME_FORMATS,
  type CurrencyCode,
  type DateFormat,
  type NameDisplayOrder,
  type OrganizationLocalizationSettings,
  type OrgLanguage,
  type TimeFormat,
} from "@haihire/shared";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import { cn, formatDate } from "@/lib/utils";

interface OrgRegionalSettingsFormProps {
  draft: OrganizationLocalizationSettings;
  updateDraft: <K extends keyof OrganizationLocalizationSettings>(
    key: K,
    val: OrganizationLocalizationSettings[K],
  ) => void;
  canEdit: boolean;
  isDisabled: boolean;
  isDirty: boolean;
  isSaving: boolean;
  languageOptions: Array<{ value: OrgLanguage; label: string }>;
  timezoneOptions: Array<{ value: string; label: string }>;
  currencyOptions: Array<{ value: CurrencyCode; label: string }>;
  onSave: (e: FormEvent) => void;
  onReset: () => void;
  previewDateIso: string;
}

export function OrgRegionalSettingsForm({
  draft,
  updateDraft,
  canEdit,
  isDisabled,
  isDirty,
  isSaving,
  languageOptions,
  timezoneOptions,
  currencyOptions,
  onSave,
  onReset,
  previewDateIso,
}: OrgRegionalSettingsFormProps) {
  const { t } = useI18n();

  return (
    <form
      onSubmit={onSave}
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
          onChange={(val) => updateDraft("defaultLanguage", val as OrgLanguage)}
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
            const sample = formatDate(previewDateIso, "numeric", {
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
                onClick={() => updateDraft("dateFormat", fmt as DateFormat)}
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {fmt}
                  </span>
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full border flex items-center justify-center",
                      selected
                        ? "border-blue-600 dark:border-blue-500"
                        : "border-slate-300 dark:border-slate-700",
                    )}
                  >
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-500" />
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {sample}
                </div>
              </button>
            );
          })}
        </div>
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
          {SUPPORTED_TIME_FORMATS.map((tf) => {
            const selected = draft.timeFormat === tf;
            return (
              <button
                key={tf}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isDisabled}
                onClick={() => updateDraft("timeFormat", tf as TimeFormat)}
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
                  {tf === "24H"
                    ? t("settings.localization.timeFormat24H")
                    : t("settings.localization.timeFormat12H")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Name Display Order */}
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
                  updateDraft("nameDisplayOrder", order as NameDisplayOrder)
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
                    : t("settings.localization.nameOrderLastFirstExample")}
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
              (val || DEFAULT_ORG_LOCALIZATION.defaultCurrency) as CurrencyCode,
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
            <SettingsButton
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={!isDirty || isSaving}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {t("settings.localization.resetButton")}
            </SettingsButton>
            <SettingsButton
              type="submit"
              icon={Save}
              pending={isSaving}
              disabled={!isDirty}
            >
              {isSaving ? t("common.saving") : t("settings.saveChanges")}
            </SettingsButton>
          </div>
        </div>
      )}
    </form>
  );
}
