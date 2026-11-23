"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import type { Step1TouchedState } from "../wizard-step-details";

interface WizardStepScheduleHeadcountAccordionProps {
  scheduleOpen: boolean;
  setScheduleOpen: (val: boolean) => void;
  applicationDeadline: string;
  setApplicationDeadline: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  openings: string;
  setOpenings: (val: string) => void;
  showOpeningsError: boolean;
  setTouched: React.Dispatch<React.SetStateAction<Step1TouchedState>>;
}

export function WizardStepScheduleHeadcountAccordion({
  scheduleOpen,
  setScheduleOpen,
  applicationDeadline,
  setApplicationDeadline,
  startDate,
  setStartDate,
  openings,
  setOpenings,
  showOpeningsError,
  setTouched,
}: WizardStepScheduleHeadcountAccordionProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-border bg-muted/30 transition-colors">
      <button
        type="button"
        onClick={() => setScheduleOpen(!scheduleOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-accent/50 transition-colors",
          !scheduleOpen ? "rounded-lg" : "rounded-t-lg",
        )}
      >
        <div className="flex items-center gap-2">
          {scheduleOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground">
            {t("jobs.wizard.scheduleHeadcountTitle")}
          </span>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
            {t("jobs.wizard.compensationOptional")}
          </span>
        </div>
      </button>

      {!scheduleOpen ? (
        <div className="px-4 pb-4 pt-0 text-[11px] text-muted-foreground">
          {t("jobs.wizard.scheduleHeadcountHintClosed")}
        </div>
      ) : (
        <div className="px-4 pb-5 pt-4 space-y-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="job-application-deadline"
                className="block text-[11px] font-medium text-foreground mb-1"
              >
                {t("jobs.wizard.applicationDeadlineLabel")}
              </label>
              <Input
                id="job-application-deadline"
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("jobs.wizard.applicationDeadlineHint")}
              </p>
            </div>

            <div>
              <label
                htmlFor="job-start-date"
                className="block text-[11px] font-medium text-foreground mb-1"
              >
                {t("jobs.wizard.startDateLabel")}
              </label>
              <Input
                id="job-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("jobs.wizard.startDateHint")}
              </p>
            </div>
          </div>

          <div className="sm:max-w-xs">
            <label
              htmlFor="job-openings"
              className="block text-[11px] font-medium text-foreground mb-1"
            >
              {t("jobs.wizard.openingsLabel")}
            </label>
            <Input
              id="job-openings"
              type="number"
              min={1}
              max={10000}
              step={1}
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, openings: true }))}
              className={cn(
                "h-9 text-xs",
                showOpeningsError &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              )}
            />
            {showOpeningsError ? (
              <p className="text-[11px] text-destructive font-medium mt-1">
                {t("jobs.wizard.openingsError")}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("jobs.wizard.openingsHint")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
