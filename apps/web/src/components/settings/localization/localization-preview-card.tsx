"use client";

import {
  Banknote,
  Calendar,
  Clock,
  Eye,
  Globe,
  Languages,
  UserCheck,
} from "lucide-react";
import type {
  CurrencyCode,
  OrganizationLocalizationSettings,
} from "@haihire/shared";
import { useI18n } from "@/i18n";
import {
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

interface LocalizationPreviewCardProps {
  draft: OrganizationLocalizationSettings;
  previewRelativeDate: Date;
}

export function LocalizationPreviewCard({
  draft,
  previewRelativeDate,
}: LocalizationPreviewCardProps) {
  const { t } = useI18n();

  return (
    <aside className="xl:col-span-5 xl:sticky xl:top-6 rounded-xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
          <Eye className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("settings.localization.previewTitle")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("settings.localization.previewSub")}
          </p>
        </div>
      </div>

      <div
        data-testid="localization-live-preview"
        className="divide-y divide-border rounded-lg border border-border bg-muted/40"
      >
        {/* Preview: Candidate Name */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.localization.previewCandidateName")}</span>
          </div>
          <span
            data-testid="preview-candidate-name"
            className="text-xs font-semibold text-foreground"
          >
            {getCandidateDisplayName(PREVIEW_CANDIDATE, draft)}
          </span>
        </div>

        {/* Preview: Date */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.localization.previewDate")}</span>
          </div>
          <span
            data-testid="preview-date"
            className="text-xs font-semibold font-mono text-foreground"
          >
            {formatDate(PREVIEW_DATE_ISO, "numeric", draft)}
          </span>
        </div>

        {/* Preview: Time */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.localization.previewTime")}</span>
          </div>
          <span
            data-testid="preview-time"
            className="text-xs font-semibold font-mono text-foreground"
          >
            {formatTime(PREVIEW_TIME, draft)}
          </span>
        </div>

        {/* Preview: Relative Time */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.localization.previewRelativeTime")}</span>
          </div>
          <span
            data-testid="preview-relative-time"
            className="text-xs font-semibold text-foreground"
          >
            {formatRelativeTime(previewRelativeDate, draft)}
          </span>
        </div>

        {/* Preview: Salary */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.localization.previewSalary")}</span>
          </div>
          <span
            data-testid="preview-salary"
            className="text-xs font-semibold text-foreground"
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t("settings.localization.previewTimezone")}</span>
          </div>
          <span
            data-testid="preview-timezone"
            className="text-[11px] font-mono font-semibold text-foreground truncate max-w-[180px]"
          >
            {draft.timezone}
          </span>
        </div>
      </div>
    </aside>
  );
}
