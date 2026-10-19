"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  Send,
  Check,
  FileEdit,
  Lock,
  Briefcase,
  MapPin,
  FileUp,
  Target,
  AlertTriangle,
  Trash2,
  Save,
} from "lucide-react";
import type { Job } from "@/types";

interface WizardStepPublishProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
  publishMode: "publish" | "draft" | "closed";
  setPublishMode: (m: "publish" | "draft" | "closed") => void;
  jobTitle: string;
  location: string;
  resumeSetting: "required" | "off";
  screeningQuestionsCount: number;
  isSaving: boolean;
  onOpenDeleteConfirm: () => void;
  onCancel: () => void;
  onBack: () => void;
  onSaveJob: () => void;
}

export function WizardStepPublish({
  mode,
  initialJob,
  publishMode,
  setPublishMode,
  jobTitle,
  location,
  resumeSetting,
  screeningQuestionsCount,
  isSaving,
  onOpenDeleteConfirm,
  onCancel,
  onBack,
  onSaveJob,
}: WizardStepPublishProps) {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {mode === "create"
            ? t("jobs.wizard.readyToGo")
            : t("jobs.wizard.publishDistributionTitle")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {mode === "create"
            ? t("jobs.wizard.readyToGoDesc")
            : t("jobs.wizard.controlStatusDesc")}
        </p>
      </div>

      {/* Selection Cards */}
      <div
        className={`grid grid-cols-1 ${
          mode === "edit" ? "sm:grid-cols-3" : "sm:grid-cols-2"
        } gap-4`}
      >
        {/* Card 1: Publish Now */}
        <label
          className={`w-full block text-left relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs space-y-3 ${
            publishMode === "publish"
              ? "border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-600/10"
              : "border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300"
          }`}
        >
          <input
            type="radio"
            name="publishMode"
            value="publish"
            checked={publishMode === "publish"}
            onChange={() => setPublishMode("publish")}
            className="sr-only"
            aria-label={
              mode === "create"
                ? t("jobs.wizard.publishNow")
                : t("jobs.wizard.openPublished")
            }
          />
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Send className="h-4 w-4" />
            </div>
            {publishMode === "publish" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {mode === "create"
                ? t("jobs.wizard.publishNow")
                : t("jobs.wizard.openPublished")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {t("jobs.wizard.publishNowDesc")}
            </p>
          </div>
        </label>

        {/* Card 2: Save as draft */}
        <label
          className={`w-full block text-left relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs space-y-3 ${
            publishMode === "draft"
              ? "border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-600/10"
              : "border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300"
          }`}
        >
          <input
            type="radio"
            name="publishMode"
            value="draft"
            checked={publishMode === "draft"}
            onChange={() => setPublishMode("draft")}
            className="sr-only"
            aria-label={t("jobs.wizard.saveDraft")}
          />
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <FileEdit className="h-4 w-4" />
            </div>
            {publishMode === "draft" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("jobs.wizard.saveDraft")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {t("jobs.wizard.saveDraftDesc")}
            </p>
          </div>
        </label>

        {/* Card 3: Closed (Edit mode only) */}
        {mode === "edit" && (
          <label
            className={`w-full block text-left relative p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs space-y-3 ${
              publishMode === "closed"
                ? "border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-600/10"
                : "border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name="publishMode"
              value="closed"
              checked={publishMode === "closed"}
              onChange={() => setPublishMode("closed")}
              className="sr-only"
              aria-label={t("jobs.wizard.closeJob")}
            />
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Lock className="h-4 w-4" />
              </div>
              {publishMode === "closed" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("jobs.wizard.closeJob")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t("jobs.wizard.closeJobDesc")}
              </p>
            </div>
          </label>
        )}
      </div>

      {/* Job Summary Card */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {t("jobs.wizard.jobSummaryTitle")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-slate-400 block text-[10px]">
                {t("jobs.wizard.titleSub")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {jobTitle.trim() || t("jobs.wizard.untitledJob")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-slate-400 block text-[10px]">
                {t("jobs.wizard.locationSub")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {location.trim() || t("jobs.workplace.remote")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              <FileUp className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-slate-400 block text-[10px]">
                {t("jobs.wizard.resumeSub")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {resumeSetting === "required"
                  ? t("jobs.wizard.requiredOption")
                  : t("jobs.wizard.offOption")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              <Target className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-slate-400 block text-[10px]">
                {t("jobs.wizard.questionsSub")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {screeningQuestionsCount} {t("jobs.wizard.questionsCountText")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone (Edit mode only) */}
      {mode === "edit" && initialJob && (
        <div className="rounded-2xl border border-rose-200/90 bg-white p-6 shadow-xs dark:border-rose-900/60 dark:bg-slate-900 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("jobs.wizard.dangerZoneTitle")}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("jobs.wizard.dangerZoneDesc")}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-rose-100 dark:border-rose-950">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("jobs.wizard.deletePermanentTitle")}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("jobs.wizard.deletePermanentDesc")}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onOpenDeleteConfirm}
              className="h-9 px-4 text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span>{t("jobs.wizard.deleteJobAction")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Step 4 Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          {t("common.cancel")}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {t("jobs.wizard.backAction")}
          </Button>
          <Button
            type="button"
            onClick={onSaveJob}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              t("jobs.wizard.saving")
            ) : mode === "create" ? (
              publishMode === "publish" ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {t("jobs.wizard.publishNow")}
                </>
              ) : (
                <>
                  <FileEdit className="h-3.5 w-3.5" />
                  {t("jobs.wizard.saveDraft")}
                </>
              )
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {t("jobs.wizard.saveAndUpdateJob")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
