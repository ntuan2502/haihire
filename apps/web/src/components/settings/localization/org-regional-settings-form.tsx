"use client";

import { Save } from "lucide-react";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsReadOnlyBanner } from "@/components/settings/settings-read-only-banner";
import type { FormEvent } from "react";
import { Globe, RotateCcw } from "lucide-react";
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
      className="rounded-xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
          <Globe className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("settings.localization.orgCardTitle")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("settings.localization.orgCardSub")}
          </p>
        </div>
      </div>

      {!canEdit && (
        <SettingsReadOnlyBanner messageKey="settings.readOnlyAdmin" />
      )}

      {/* 1. Organization Default Language */}
      <div className="space-y-1.5">
        <label
          htmlFor="org-default-language-trigger"
          className="block text-xs font-medium text-foreground"
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
          triggerClassName="w-full text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          {t("settings.localization.defaultLanguageHint")}
        </p>
      </div>

      {/* 2. Timezone */}
      <div className="space-y-1.5">
        <label
          htmlFor="org-timezone-trigger"
          className="block text-xs font-medium text-foreground"
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
          triggerClassName="w-full text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          {t("settings.localization.timezoneHint")}
        </p>
      </div>

      {/* 3. Date Format */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-foreground">
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
                  "px-3.5 py-2.5 rounded-lg border text-left transition-colors",
                  isDisabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer",
                  selected
                    ? "border-primary bg-accent/60 text-foreground ring-1 ring-ring/30"
                    : "border-border bg-background hover:bg-accent/40 text-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {fmt}
                  </span>
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full border flex items-center justify-center",
                      selected ? "border-primary" : "border-border",
                    )}
                  >
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {sample}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Time Format */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-foreground">
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
                  "px-3.5 py-2.5 rounded-lg border text-left transition-colors",
                  isDisabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer",
                  selected
                    ? "border-primary bg-accent/60 text-foreground ring-1 ring-ring/30"
                    : "border-border bg-background hover:bg-accent/40 text-foreground",
                )}
              >
                <div className="text-xs font-semibold text-foreground">
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
        <label className="block text-xs font-medium text-foreground">
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
                  "px-3.5 py-2.5 rounded-lg border text-left transition-colors",
                  isDisabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer",
                  selected
                    ? "border-primary bg-accent/60 text-foreground ring-1 ring-ring/30"
                    : "border-border bg-background hover:bg-accent/40 text-foreground",
                )}
              >
                <div className="text-xs font-semibold text-foreground">
                  {order === "FIRST_LAST"
                    ? t("settings.localization.nameOrderFirstLast")
                    : t("settings.localization.nameOrderLastFirst")}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
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
          htmlFor="org-default-currency-trigger"
          className="block text-xs font-medium text-foreground"
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
          triggerClassName="w-full text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          {t("settings.localization.currencyHint")}
        </p>
      </div>

      {/* Action Row */}
      {canEdit && (
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
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
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              {t("settings.localization.resetButton")}
            </SettingsButton>
            <SettingsButton
              type="submit"
              icon={Save}
              pending={isSaving}
              disabled={!isDirty}
            >
              {isSaving ? t("common.saving") : t("common.saveChanges")}
            </SettingsButton>
          </div>
        </div>
      )}
    </form>
  );
}
