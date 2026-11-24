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
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 py-3 shrink-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        {/* Left: Back Link & Stepper */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {mode === "create" ? (
            <Link
              href="/jobs"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("jobs.title")}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/jobs/${initialJob?.id}/pipeline`)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                  className={`flex items-center gap-2 text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "font-semibold text-foreground"
                      : isPassed
                        ? "font-medium text-muted-foreground"
                        : "font-normal text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isPassed
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
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
                      "h-1.5 rounded-full transition-[width] duration-300",
                      isCurrent
                        ? "w-4 bg-primary"
                        : isPassed
                          ? "w-1.5 bg-emerald-500"
                          : "w-1.5 bg-muted",
                    )}
                  />
                );
              })}
            </div>
            <span className="text-xs font-semibold text-foreground">
              {currentStepIndex}/{visibleSteps.length}:{" "}
              {visibleSteps.find((s) => s.id === currentStep)?.label}
            </span>
          </div>
        </div>

        {/* Right: Preview & Save Controls */}
        <div className="flex items-center gap-2.5">
          {mode === "create" && draftSavedAt && (
            <span className="text-[11px] text-muted-foreground hidden lg:flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              <span>{t("jobs.wizard.autoSaved")}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2.5 py-1.5 rounded-md hover:bg-accent whitespace-nowrap shrink-0"
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="whitespace-nowrap">
              {t("jobs.wizard.candidatePreview")}
            </span>
          </button>
          {mode === "edit" && (
            <Button
              type="button"
              size="sm"
              onClick={onSaveJob}
              disabled={isSaving || (currentStep === 1 && !isStep1Valid)}
              className="h-8 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {isSaving
                  ? t("jobs.wizard.saving")
                  : t("jobs.wizard.saveChanges")}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
