"use client";

import { Languages } from "lucide-react";
import { SettingsCard } from "@/components/settings/settings-card";
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
    <SettingsCard className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
          <Languages className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("settings.localization.personalCardTitle")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("settings.localization.personalCardSub")}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="personal-ui-language"
          className="block text-xs font-medium text-foreground"
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
          triggerClassName="w-full text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          {t("settings.localization.personalLanguageHint")}
        </p>
      </div>
    </SettingsCard>
  );
}
