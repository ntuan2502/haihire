import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
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
  onStep2Continue: () => void;
  onBackToStep2: () => void;
  onStep3Skip?: () => void;
  onStep3Continue: () => void;
  onBackToStep3: () => void;
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
  onStep2Continue,
  onBackToStep2,
  onStep3Skip,
  onStep3Continue,
  onBackToStep3,
  onSaveJob,
}: WizardMobileFooterProps) {
  const { t } = useI18n();

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-2">
      {currentStep === 1 ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onStep1Continue}
            disabled={!isStep1Valid}
            className="text-xs font-semibold px-4 cursor-pointer"
          >
            {t("jobs.wizard.continueToStep2")}
          </Button>
        </>
      ) : currentStep === 2 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToStep1}
            className="text-xs cursor-pointer"
          >
            {t("common.back")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onStep2Continue}
            className="text-xs font-semibold px-4 cursor-pointer"
          >
            {t("jobs.wizard.continueToScoring")}
          </Button>
        </>
      ) : currentStep === 3 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToStep2}
            className="text-xs cursor-pointer"
          >
            {t("common.back")}
          </Button>
          <div className="flex items-center gap-1.5">
            {mode === "create" && onStep3Skip && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onStep3Skip}
                className="text-xs px-2.5 cursor-pointer"
              >
                {t("jobs.wizard.skipForNow")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onStep3Continue}
              className="text-xs font-semibold px-3.5 cursor-pointer"
            >
              {t("jobs.wizard.continueToPublish")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToStep3}
            className="text-xs cursor-pointer"
          >
            {t("common.back")}
          </Button>
          {mode === "create" ? (
            <Button
              type="button"
              size="sm"
              onClick={onSaveJob}
              disabled={isSaving}
              className="text-xs font-semibold px-4 gap-1.5 cursor-pointer"
            >
              {isSaving
                ? t("common.saving")
                : publishMode === "publish"
                  ? t("jobs.wizard.publishNow")
                  : t("jobs.wizard.saveDraft")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onSaveJob}
              disabled={isSaving || !isStep1Valid}
              className="text-xs font-semibold px-4 gap-1.5 cursor-pointer"
            >
              {isSaving ? t("common.saving") : t("common.saveChanges")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
