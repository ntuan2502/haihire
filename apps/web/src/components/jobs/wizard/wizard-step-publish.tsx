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
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "create"
            ? t("jobs.wizard.readyToGo")
            : t("jobs.wizard.publishDistributionTitle")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
          className={`w-full block text-left relative p-5 rounded-xl border transition-colors cursor-pointer shadow-xs space-y-3 ${
            publishMode === "publish"
              ? "border-primary bg-accent/40 ring-1 ring-ring/30"
              : "border-border bg-card hover:bg-accent/20"
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Send className="h-4 w-4" />
            </div>
            {publishMode === "publish" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {mode === "create"
                ? t("jobs.wizard.publishNow")
                : t("jobs.wizard.openPublished")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("jobs.wizard.publishNowDesc")}
            </p>
          </div>
        </label>

        {/* Card 2: Save as draft */}
        <label
          className={`w-full block text-left relative p-5 rounded-xl border transition-colors cursor-pointer shadow-xs space-y-3 ${
            publishMode === "draft"
              ? "border-primary bg-accent/40 ring-1 ring-ring/30"
              : "border-border bg-card hover:bg-accent/20"
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileEdit className="h-4 w-4" />
            </div>
            {publishMode === "draft" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("jobs.wizard.saveDraft")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("jobs.wizard.saveDraftDesc")}
            </p>
          </div>
        </label>

        {/* Card 3: Closed (Edit mode only) */}
        {mode === "edit" && (
          <label
            className={`w-full block text-left relative p-5 rounded-xl border transition-colors cursor-pointer shadow-xs space-y-3 ${
              publishMode === "closed"
                ? "border-primary bg-accent/40 ring-1 ring-ring/30"
                : "border-border bg-card hover:bg-accent/20"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
              </div>
              {publishMode === "closed" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("jobs.wizard.closeJob")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("jobs.wizard.closeJobDesc")}
              </p>
            </div>
          </label>
        )}
      </div>

      {/* Job Summary Card */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-semibold text-foreground">
          {t("jobs.wizard.jobSummaryTitle")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-muted-foreground block text-[10px]">
                {t("jobs.wizard.titleSub")}
              </span>
              <span className="font-semibold text-foreground">
                {jobTitle.trim() || t("jobs.wizard.untitledJob")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-muted-foreground block text-[10px]">
                {t("jobs.wizard.locationSub")}
              </span>
              <span className="font-semibold text-foreground">
                {location.trim() || t("jobs.workplace.remote")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileUp className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-muted-foreground block text-[10px]">
                {t("jobs.wizard.resumeSub")}
              </span>
              <span className="font-semibold text-foreground">
                {resumeSetting === "required"
                  ? t("jobs.wizard.requiredOption")
                  : t("jobs.wizard.offOption")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-muted-foreground block text-[10px]">
                {t("jobs.wizard.questionsSub")}
              </span>
              <span className="font-semibold text-foreground">
                {screeningQuestionsCount} {t("jobs.wizard.questionsCountText")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone (Edit mode only) */}
      {mode === "edit" && initialJob && (
        <div className="rounded-xl border border-destructive/30 bg-card text-card-foreground p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("jobs.wizard.dangerZoneTitle")}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("jobs.wizard.dangerZoneDesc")}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-destructive/20">
            <div>
              <h4 className="text-xs font-semibold text-foreground">
                {t("jobs.wizard.deletePermanentTitle")}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {t("jobs.wizard.deletePermanentDesc")}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onOpenDeleteConfirm}
              className="h-9 px-4 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md cursor-pointer shrink-0"
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
          className="text-xs cursor-pointer"
        >
          {t("common.cancel")}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs cursor-pointer"
          >
            {t("jobs.wizard.backAction")}
          </Button>
          {mode === "create" && (
            <Button
              type="button"
              onClick={onSaveJob}
              disabled={isSaving}
              className="text-xs font-semibold px-6 gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                t("jobs.wizard.saving")
              ) : publishMode === "publish" ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {t("jobs.wizard.publishNow")}
                </>
              ) : (
                <>
                  <FileEdit className="h-3.5 w-3.5" />
                  {t("jobs.wizard.saveDraft")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
