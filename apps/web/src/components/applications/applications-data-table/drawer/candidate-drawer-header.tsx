"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Columns3, ExternalLink, X } from "lucide-react";
import type { Application, ApplicationStage } from "@/types";
import { useI18n } from "@/i18n";

export interface CandidateDrawerHeaderProps {
  currentApp: Application;
  drawerTab?: string;
  onClose: () => void;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
}

export function CandidateDrawerHeader({
  currentApp,
  drawerTab,
  onClose,
  onViewInPipeline,
}: CandidateDrawerHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  const fullPageHref =
    drawerTab && drawerTab !== "overview"
      ? `/applications/${currentApp.id}?tab=${drawerTab}`
      : `/applications/${currentApp.id}`;

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        <span>{t("applications.backToTable")}</span>
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        {onViewInPipeline && (
          <button
            type="button"
            onClick={() => {
              onViewInPipeline(currentApp.id, currentApp.stage);
              onClose();
            }}
            className="h-8 px-2.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title={t("pipeline.focusCandidate")}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>{t("applications.viewInPipeline")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push(fullPageHref)}
          className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title={t("applications.openFullPage")}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("applications.openFullPage")}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
