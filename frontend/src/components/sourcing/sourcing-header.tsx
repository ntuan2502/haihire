"use client";

import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Check } from "lucide-react";
import type { TimeRangeFilter } from "@haihire/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface JobOption {
  id: string;
  title: string;
}

interface SourcingHeaderProps {
  timeRange: TimeRangeFilter;
  onTimeRangeChange: (val: TimeRangeFilter) => void;
  selectedJobId?: string;
  onJobSelect: (jobId: string | undefined) => void;
  jobs: JobOption[];
  onOpenCreateLink: () => void;
}

export function SourcingHeader({
  timeRange,
  onTimeRangeChange,
  selectedJobId,
  onJobSelect,
  jobs,
  onOpenCreateLink,
}: SourcingHeaderProps) {
  const { t } = useI18n();

  const selectedJobTitle = selectedJobId
    ? jobs.find((j) => j.id === selectedJobId)?.title || t("sourcing.allJobs")
    : t("sourcing.allJobs");

  const timeOptions: { value: TimeRangeFilter; label: string }[] = [
    { value: "7d", label: t("sourcing.time7d") },
    { value: "30d", label: t("sourcing.time30d") },
    { value: "90d", label: t("sourcing.time90d") },
    { value: "all", label: t("sourcing.timeAll") },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("sourcing.title")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t("sourcing.subtitle")}
        </p>
      </div>

      {/* Controls: Time Filter Pills + Job Dropdown + + New Link Button */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Time Filter Pills */}
        <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/60 dark:border-slate-800/60">
          {timeOptions.map((opt) => {
            const isSelected = timeRange === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTimeRangeChange(opt.value)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Job Dropdown Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs cursor-pointer max-w-[200px] truncate">
            <span className="truncate">{selectedJobTitle}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <DropdownMenuItem
              onClick={() => onJobSelect(undefined)}
              className="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg cursor-pointer"
            >
              <span>{t("sourcing.allJobs")}</span>
              {!selectedJobId && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </DropdownMenuItem>
            {jobs.map((job) => (
              <DropdownMenuItem
                key={job.id}
                onClick={() => onJobSelect(job.id)}
                className="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg cursor-pointer"
              >
                <span className="truncate">{job.title}</span>
                {selectedJobId === job.id && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* + New Link Button */}
        <Button
          onClick={() => onOpenCreateLink()}
          className="h-9 px-3.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>{t("sourcing.newLink")}</span>
        </Button>
      </div>
    </div>
  );
}
