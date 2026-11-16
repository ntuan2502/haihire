"use client";

import { Languages } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import type { OrgLanguage } from "@haihire/shared";

interface PersonalLanguageCardProps {
  locale: string;
  onLanguageChange: (val: OrgLanguage) => void;
  languageOptions: Array<{ value: OrgLanguage; label: string }>;
}

export function PersonalLanguageCard({
  locale,
  onLanguageChange,
  languageOptions,
}: PersonalLanguageCardProps) {
  const { t } = useI18n();

  return (
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
          onChange={(val) => onLanguageChange(val as OrgLanguage)}
          options={languageOptions}
          className="w-full"
          triggerClassName="w-full h-10 text-xs bg-slate-50/60 dark:bg-slate-950 rounded-xl"
        />
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {t("settings.localization.personalLanguageHint")}
        </p>
      </div>
    </div>
  );
}
