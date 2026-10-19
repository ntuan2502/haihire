import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import type { StepId } from "../types";

interface WizardMobileFooterProps {
  currentStep: StepId;
  mode: "create" | "edit";
  publishMode: "publish" | "draft" | "closed";
  isStep1Valid: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onStep1Continue: () => void;
  onBackToStep1: () => void;
  onSaveJob: () => void;
}

export function WizardMobileFooter({
  currentStep,
  mode,
  publishMode,
  isStep1Valid,
  isSaving,
  onCancel,
  onStep1Continue,
  onBackToStep1,
  onSaveJob,
}: WizardMobileFooterProps) {
  const { t } = useI18n();

  if (currentStep !== 1 && currentStep !== 4) {
    return null;
  }

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 shadow-lg flex items-center justify-between gap-3">
      {currentStep === 1 ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onStep1Continue}
            disabled={!isStep1Valid}
            className={cn(
              "text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all",
              isStep1Valid
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-blue-600/50 cursor-not-allowed opacity-60",
            )}
          >
            {t("jobs.wizard.continueToPublish")}
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToStep1}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t("jobs.wizard.backAction")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSaveJob}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs gap-1.5"
          >
            {isSaving
              ? t("jobs.wizard.saving")
              : mode === "create"
                ? publishMode === "publish"
                  ? t("jobs.wizard.publishNow")
                  : t("jobs.wizard.saveDraft")
                : t("jobs.wizard.saveChanges")}
          </Button>
        </>
      )}
    </div>
  );
}
