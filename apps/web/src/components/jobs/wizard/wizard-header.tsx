"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import { ArrowLeft, Eye, Check, CheckCircle2, Save } from "lucide-react";
import type { Job } from "@/types";
import type { StepId } from "./types";

interface WizardHeaderProps {
  mode: "create" | "edit";
  initialJob?: Job | null;
  currentStep: StepId;
  steps: Array<{ id: StepId; label: string; implemented: boolean }>;
  draftSavedAt: string | null;
  isSaving: boolean;
  isStep1Valid: boolean;
  onStepClick: (stepId: StepId) => void;
  onOpenPreview: () => void;
  onSaveJob: () => void;
}

export function WizardHeader({
  mode,
  initialJob,
  currentStep,
  steps,
  draftSavedAt,
  isSaving,
  isStep1Valid,
  onStepClick,
  onOpenPreview,
  onSaveJob,
}: WizardHeaderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const visibleSteps = steps.filter((s) => s.implemented);
  const currentStepIndex = Math.max(
    1,
    visibleSteps.findIndex((s) => s.id === currentStep) + 1,
  );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 shadow-2xs shrink-0">
      <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl">
        {/* Left: Back Link & Stepper */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {mode === "create" ? (
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("jobs.title")}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/jobs/${initialJob?.id}/pipeline`)
              }
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("jobs.wizard.backToPipeline")}</span>
            </button>
          )}

          {/* Stepper Wizard Bar (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap">
            {visibleSteps.map((step, index) => {
              const displayNumber = index + 1;
              const isActive = step.id === currentStep;
              const isPassed = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  className={`flex items-center gap-2 text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "font-bold text-slate-900 dark:text-white"
                      : isPassed
                        ? "font-medium text-slate-600 dark:text-slate-300"
                        : "font-normal text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : isPassed
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    ) : (
                      displayNumber
                    )}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stepper Wizard (Mobile Compact) */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="flex items-center gap-1">
              {visibleSteps.map((s) => {
                const isCurrent = s.id === currentStep;
                const isPassed = s.id < currentStep;
                return (
                  <span
                    key={s.id}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      isCurrent
                        ? "w-4 bg-blue-600 dark:bg-blue-400"
                        : isPassed
                          ? "w-1.5 bg-emerald-500"
                          : "w-1.5 bg-slate-200 dark:bg-slate-700",
                    )}
                  />
                );
              })}
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {currentStepIndex}/{visibleSteps.length}:{" "}
              {visibleSteps.find((s) => s.id === currentStep)?.label}
            </span>
          </div>
        </div>

        {/* Right: Preview & Save Controls */}
        <div className="flex items-center gap-2.5">
          {mode === "create" && draftSavedAt && (
            <span className="text-[11px] text-slate-400 hidden lg:flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              <span>{t("jobs.wizard.autoSaved")}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="whitespace-nowrap">
              {t("jobs.wizard.candidatePreview")}
            </span>
          </button>
          <Button
            type="button"
            onClick={onSaveJob}
            disabled={isSaving || (currentStep === 1 && !isStep1Valid)}
            className={cn(
              "h-8 px-3.5 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all",
              !isSaving && (currentStep !== 1 || isStep1Valid)
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-blue-600/50 cursor-not-allowed opacity-60",
            )}
          >
            {mode === "create" ? (
              <span>
                {isSaving
                  ? t("jobs.wizard.saving")
                  : t("jobs.wizard.saveAndPublish")}
              </span>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>
                  {isSaving
                    ? t("jobs.wizard.saving")
                    : t("jobs.wizard.saveChanges")}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
