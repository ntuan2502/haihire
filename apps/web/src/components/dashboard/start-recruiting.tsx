"use client";

import { Briefcase, Plus, ArrowRight } from "lucide-react";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

interface StartRecruitingProps {
  onOpenCreateJob: () => void;
  onCreateTestJob?: () => void;
  onImportFromFile?: () => void;
}

export function StartRecruiting({ onOpenCreateJob }: StartRecruitingProps) {
  const { t } = useI18n();
  const canCreateJob = useHasPermission("job:create");

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl text-center">
        {/* Top Briefcase Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-foreground border border-border shadow-xs">
          <Briefcase className="h-6 w-6 stroke-[1.75]" />
        </div>

        {/* Title & Subtitle */}
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
          {t("dashboard.startRecruitingTitle")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("dashboard.startRecruitingSubtitle")}
        </p>

        {/* Primary Action Button: Create a new job */}
        {canCreateJob && (
          <div className="mt-8">
            <button
              type="button"
              onClick={onOpenCreateJob}
              className="group flex w-full items-center justify-between gap-3 rounded-xl bg-primary px-5 py-4 text-left text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-primary-foreground">
                    {t("dashboard.createNewJob")}
                  </h3>
                  <p className="text-xs text-primary-foreground/80">
                    {t("dashboard.createNewJobDesc")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary-foreground/80 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
