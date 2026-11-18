"use client";

import { RotateCcw } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { CustomSelect } from "@/components/shared/custom-select";
import { Button } from "@/components/ui/button";
import type { Job } from "@/types";
import type { SortField, SortDirection } from "../types";
import { useI18n } from "@/i18n";

interface ApplicationsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  fixedJobId?: string;
  currentJobFilter: string;
  onJobFilterChange: (val: string) => void;
  scoreFilter: string;
  onScoreFilterChange: (val: string) => void;
  sortField: SortField;
  onSortFieldChange: (val: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (val: SortDirection) => void;
  onResetFilters: () => void;
}

export function ApplicationsFilterDrawer({
  isOpen,
  onClose,
  jobs,
  fixedJobId,
  currentJobFilter,
  onJobFilterChange,
  scoreFilter,
  onScoreFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  onResetFilters,
}: ApplicationsFilterDrawerProps) {
  const { t } = useI18n();

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={t("applications.filters")}
      description={t("jobs.filterJobsDesc")}
      width="max-w-md"
    >
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* 1. FILTER BY JOB */}
          {!fixedJobId && (
            <div className="space-y-2.5">
              <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">
                {t("applications.filterByJob")}
              </span>
              <CustomSelect
                value={currentJobFilter}
                onChange={onJobFilterChange}
                options={[
                  { value: "ALL", label: t("applications.allJobs") },
                  ...jobs.map((j) => ({ value: j.id, label: j.title })),
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-background rounded-md"
              />
            </div>
          )}

          {/* 2. MATCH SCORE RANGE */}
          <div className="space-y-2.5">
            <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">
              {t("applications.score")}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "ALL", label: t("applications.scoreFilters.all") },
                { id: "80", label: t("applications.scoreFilters.excellent") },
                { id: "60", label: t("applications.scoreFilters.good") },
                {
                  id: "BELOW_60",
                  label: t("applications.scoreFilters.review"),
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onScoreFilterChange(item.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    scoreFilter === item.id
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. SORT BY */}
          <div className="space-y-2.5">
            <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">
              {t("jobs.sortByUpper")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <CustomSelect
                value={sortField}
                onChange={(val) => onSortFieldChange(val as SortField)}
                options={[
                  {
                    value: "applied",
                    label: t("applications.columns.applied"),
                  },
                  {
                    value: "candidate",
                    label: t("applications.columns.candidate"),
                  },
                  { value: "job", label: t("applications.columns.job") },
                  { value: "score", label: t("applications.columns.score") },
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-background rounded-md"
              />

              <CustomSelect
                value={sortDirection}
                onChange={(val) => onSortDirectionChange(val as SortDirection)}
                options={[
                  { value: "desc", label: t("jobs.descending") },
                  { value: "asc", label: t("jobs.ascending") },
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-background rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/40">
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
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
              className="h-8 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md cursor-pointer"
            >
              {t("jobs.done")}
            </Button>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
