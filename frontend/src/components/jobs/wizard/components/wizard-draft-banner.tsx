import { Sparkles } from "lucide-react";
import { useI18n } from "@/i18n";

interface WizardDraftBannerProps {
  draftSavedAt: string | null;
  onDiscard: () => void;
  onDismiss: () => void;
}

export function WizardDraftBanner({
  draftSavedAt,
  onDiscard,
  onDismiss,
}: WizardDraftBannerProps) {
  const { t } = useI18n();

  return (
    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          {t("jobs.wizard.draftRestored")}
          {draftSavedAt ? ` (${draftSavedAt})` : ""}.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
        >
          {t("jobs.wizard.discardDraft")}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
        >
          {t("jobs.wizard.continueEditing")}
        </button>
      </div>
    </div>
  );
}
