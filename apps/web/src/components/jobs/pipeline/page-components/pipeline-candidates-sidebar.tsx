"use client";

import { useI18n } from "@/i18n";
import { Search, ArrowUpDown, Menu, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import { PipelineCandidateCard } from "@/components/jobs/pipeline/pipeline-candidate-card";
import type { Application } from "@/types";

export interface PipelineCandidatesSidebarProps {
  mobileDetailOpen: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: "score" | "newest" | "oldest" | "name";
  onSortByChange: (val: "score" | "newest" | "oldest" | "name") => void;
  candidateCountText: string;
  filteredCandidates: Application[];
  selectedAppId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  canEdit: boolean;
}

export function PipelineCandidatesSidebar({
  mobileDetailOpen,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  candidateCountText,
  filteredCandidates,
  selectedAppId,
  onSelectCandidate,
  canEdit,
}: PipelineCandidatesSidebarProps) {
  const { t } = useI18n();

  return (
    <aside
      className={`w-full md:w-80 lg:w-84 shrink-0 flex flex-col h-full border-r border-border bg-card text-card-foreground overflow-hidden transition-colors duration-200 ${
        mobileDetailOpen ? "hidden md:flex" : "flex"
      }`}
    >
      {/* Search box & Toolbar */}
      <div className="shrink-0 p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            name="candidates-search"
            placeholder={t("candidates.searchCandidates")}
            aria-label={t("candidates.searchCandidates")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-background border-input rounded-md"
          />
        </div>

        {/* Sort toolbar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
          <CustomSelect
            value={sortBy}
            onChange={(val) =>
              onSortByChange(val as "score" | "newest" | "oldest" | "name")
            }
            size="sm"
            icon={ArrowUpDown}
            options={[
              { value: "score", label: t("applications.columns.score") },
              { value: "newest", label: t("candidates.columns.added") },
              { value: "oldest", label: t("common.created") },
              { value: "name", label: t("candidates.candidateName") },
            ]}
            className="w-auto"
            triggerClassName="h-7 text-xs py-1 px-2.5 font-semibold"
          />

          <button
            type="button"
            disabled
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground opacity-40 cursor-not-allowed transition-colors"
            title={t("pipeline.filterOptions")}
          >
            <Menu className="h-3 w-3" />
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground font-medium pt-0.5">
          {candidateCountText}
        </p>
      </div>

      {/* Candidates List Container */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border scrollbar-thin">
        {filteredCandidates.length === 0 ? (
          <div className="pt-8 pb-6 px-4 flex flex-col items-center text-center space-y-2 text-muted-foreground">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <User className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-foreground">
                {t("candidates.noCandidatesYet")}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {t("candidates.noApplicationsMatchingStage")}
              </p>
            </div>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <PipelineCandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={
                String(candidate.id) === String(selectedAppId) ||
                String(candidate.candidateId) === String(selectedAppId)
              }
              onSelect={() => {
                onSelectCandidate(candidate.id);
              }}
              canDrag={canEdit}
            />
          ))
        )}
      </div>
    </aside>
  );
}
