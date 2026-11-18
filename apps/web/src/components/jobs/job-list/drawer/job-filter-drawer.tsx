"use client";

import { X, RotateCcw } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { CustomSelect } from "@/components/shared/custom-select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { JobFilterCriteria } from "../types";

export interface JobFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilters: string[];
  typeFilters: string[];
  expFilters: string[];
  workplaceFilters: string[];
  sortBy: "created" | "title" | "applicants";
  sortOrder: "desc" | "asc";
  onToggleFilter: (
    key: "status" | "type" | "exp" | "workplace",
    currentList: string[],
    val: string,
  ) => void;
  onFilterUpdate: (updates: JobFilterCriteria) => void;
  onResetFilters: () => void;
}

export function JobFilterDrawer({
  isOpen,
  onClose,
  statusFilters,
  typeFilters,
  expFilters,
  workplaceFilters,
  sortBy,
  sortOrder,
  onToggleFilter,
  onFilterUpdate,
  onResetFilters,
}: JobFilterDrawerProps) {
  const { t } = useI18n();

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      panelClassName="justify-between"
    >
      {/* Header */}
      <div className="p-6 border-b border-border flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("jobs.filterJobs")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("jobs.filterJobsDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body: Filter Sections */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
        {/* 1. STATUS */}
        <div className="space-y-2.5">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider block">
            {t("jobs.statusUpper")}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "PUBLISHED", label: t("jobs.openStatus") },
              { id: "DRAFT", label: t("jobs.draftStatus") },
              { id: "CLOSED", label: t("jobs.closed") },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onToggleFilter("status", statusFilters, st.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  statusFilters.includes(st.id)
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. EMPLOYMENT TYPE */}
        <div className="space-y-2.5">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider block">
            {t("jobs.employmentTypeUpper")}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "FULL_TIME", label: t("jobs.fullTime") },
              { id: "PART_TIME", label: t("jobs.partTime") },
              { id: "CONTRACT", label: t("jobs.contract") },
              { id: "INTERNSHIP", label: t("jobs.internship") },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleFilter("type", typeFilters, item.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  typeFilters.includes(item.id)
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. EXPERIENCE LEVEL */}
        <div className="space-y-2.5">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider block">
            {t("jobs.experienceLevelUpper")}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "ENTRY_LEVEL", label: t("jobs.experience.junior") },
              { id: "MID_LEVEL", label: t("jobs.experience.mid") },
              { id: "SENIOR_LEVEL", label: t("jobs.experience.senior") },
              { id: "LEAD", label: t("jobs.experience.lead") },
              { id: "EXECUTIVE", label: t("jobs.experience.executive") },
            ].map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => onToggleFilter("exp", expFilters, exp.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  expFilters.includes(exp.id)
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. WORK ARRANGEMENT */}
        <div className="space-y-2.5">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider block">
            {t("jobs.workArrangementUpper")}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "REMOTE", label: t("jobs.workplace.remote") },
              { id: "HYBRID", label: t("jobs.workplace.hybrid") },
              { id: "ON_SITE", label: t("jobs.workplace.onsite") },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() =>
                  onToggleFilter("workplace", workplaceFilters, w.id)
                }
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  workplaceFilters.includes(w.id)
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. SORT BY */}
        <div className="space-y-2.5">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider block">
            {t("jobs.sortByUpper")}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <CustomSelect
              value={sortBy}
              onChange={(val) =>
                onFilterUpdate({
                  sortBy: val as "created" | "title" | "applicants",
                })
              }
              options={[
                { value: "created", label: t("jobs.dateCreated") },
                { value: "title", label: t("jobs.jobTitle") },
                { value: "applicants", label: t("jobs.applicants") },
              ]}
              className="w-full"
              triggerClassName="h-9 text-xs font-normal"
            />

            <CustomSelect
              value={sortOrder}
              onChange={(val) =>
                onFilterUpdate({ sortOrder: val as "desc" | "asc" })
              }
              options={[
                { value: "desc", label: t("jobs.descending") },
                { value: "asc", label: t("jobs.ascending") },
              ]}
              className="w-full"
              triggerClassName="h-9 text-xs font-normal"
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex items-center justify-between bg-muted/40">
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t("jobs.resetAll")}</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            {t("jobs.done")}
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
