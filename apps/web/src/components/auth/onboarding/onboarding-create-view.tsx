"use client";

import { type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

interface OnboardingCreateViewProps {
  hasExistingOrgs: boolean;
  onSwitchMode: (mode: "select" | "create" | "join") => void;
  onSubmit: (e: FormEvent) => void;
  orgName: string;
  onNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
  slug: string;
  onSlugChange: (e: ChangeEvent<HTMLInputElement>) => void;
  displayHost: string;
  submitting: boolean;
}

export function OnboardingCreateView({
  hasExistingOrgs,
  onSwitchMode,
  onSubmit,
  orgName,
  onNameChange,
  slug,
  onSlugChange,
  displayHost,
  submitting,
}: OnboardingCreateViewProps) {
  const { t } = useI18n();

  return (
    <div>
      {hasExistingOrgs && (
        <button
          type="button"
          onClick={() => onSwitchMode("select")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("onboarding.backToSelect")}
        </button>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("onboarding.createOrgTitle")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("onboarding.createOrgSubtitle")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("onboarding.orgNameLabel")}
          </label>
          <Input
            type="text"
            required
            placeholder={t("onboarding.orgNamePlaceholder")}
            value={orgName}
            onChange={onNameChange}
            className="h-10 rounded-lg border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("onboarding.slugLabel")}
          </label>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <span className="px-3 text-xs text-slate-400 font-mono select-none">
              {displayHost ? `${displayHost}/` : "workspace/"}
            </span>
            <input
              type="text"
              required
              placeholder={t("onboarding.slugPlaceholder")}
              value={slug}
              onChange={onSlugChange}
              className="h-10 flex-1 bg-white dark:bg-slate-950 px-3 text-sm font-mono border-l border-slate-200 dark:border-slate-800 outline-hidden"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {t("onboarding.slugHint")}
          </p>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer"
        >
          {submitting
            ? t("onboarding.creatingOrg")
            : t("onboarding.createOrgButton")}
        </Button>
      </form>

      {/* Footer switch link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onSwitchMode("join")}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          {t("onboarding.joinOrgInstead")}
        </button>
      </div>
    </div>
  );
}
