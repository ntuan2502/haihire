"use client";

import { RotateCcw } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { CustomSelect } from "@/components/shared/custom-select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { Job } from "@/types";
import type {
  SortField,
  SortDirection,
} from "../hooks/use-candidates-filter-sort";

export interface CandidatesFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  candidateFilter: string[];
  onToggleFilter: (filterId: string) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  onResetFilters: () => void;
}

export function CandidatesFilterDrawer({
  isOpen,
  onClose,
  jobs,
  selectedJobId,
  onJobChange,
  candidateFilter,
  onToggleFilter,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  onResetFilters,
}: CandidatesFilterDrawerProps) {
  const { t } = useI18n();

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={t("candidates.filters")}
      description={t("jobs.filterJobsDesc")}
      width="max-w-md"
    >
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* 1. FILTER BY JOB */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
              {t("applications.filterByJob")}
            </span>
            <CustomSelect
              value={selectedJobId}
              onChange={onJobChange}
              options={[
                { value: "ALL", label: t("applications.allJobs") },
                ...jobs.map((j) => ({ value: j.id, label: j.title })),
              ]}
              className="w-full"
              triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
            />
          </div>

          {/* 2. PROFILE STATUS */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
              {t("jobs.statusUpper")}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "WITH_RESUME", label: t("candidates.withCv") },
                {
                  id: "HAS_APPLICATIONS",
                  label: t("candidates.hasApplications"),
                },
                { id: "UNASSIGNED", label: t("candidates.unassigned") },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onToggleFilter(st.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    candidateFilter.includes(st.id)
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. SORT BY */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
              {t("jobs.sortByUpper")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <CustomSelect
                value={sortField}
                onChange={(val) => onSortFieldChange(val as SortField)}
                options={[
                  { value: "added", label: t("candidates.columns.added") },
                  { value: "name", label: t("candidates.columns.name") },
                  { value: "email", label: t("candidates.columns.email") },
                  { value: "phone", label: t("candidates.columns.phone") },
                  {
                    value: "applications",
                    label: t("candidates.columns.applications"),
                  },
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
              />

              <CustomSelect
                value={sortDirection}
                onChange={(val) => onSortDirectionChange(val as SortDirection)}
                options={[
                  { value: "desc", label: t("jobs.descending") },
                  { value: "asc", label: t("jobs.ascending") },
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
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
              className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              {t("jobs.done")}
            </Button>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
