"use client";

import { ArrowDown, ArrowUpDown } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { useI18n } from "@/i18n";
import type { CandidateItem } from "@/lib/utils";
import type {
  SortField,
  SortDirection,
} from "../hooks/use-candidates-filter-sort";
import type { CandidateVisibleColumns } from "../toolbar/candidates-column-picker";
import { CandidateTableRow } from "./candidate-table-row";

export interface CandidatesTableProps {
  candidates: CandidateItem[];
  visibleColumns: CandidateVisibleColumns;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  canEdit: boolean;
  onSelectCandidate: (candidate: CandidateItem) => void;
  onDeleteCandidate: (candidate: CandidateItem) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function CandidatesTable({
  candidates,
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  canEdit,
  onSelectCandidate,
  onDeleteCandidate,
  currentPage,
  totalPages,
  totalCount,
  rowsPerPage,
  onPageChange,
  onPageSizeChange,
}: CandidatesTableProps) {
  const { t } = useI18n();

  const sortableColumns: { id: SortField; label: string }[] = [
    { id: "name", label: t("candidates.columns.name") },
    { id: "email", label: t("candidates.columns.email") },
    { id: "phone", label: t("candidates.columns.phone") },
    { id: "applications", label: t("candidates.columns.applications") },
    { id: "added", label: t("candidates.columns.added") },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
            <tr>
              {sortableColumns.map((col) => {
                if (!visibleColumns[col.id]) return null;
                const isSorted = sortField === col.id;
                const ariaSort = isSorted
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className="py-3 px-5 select-none"
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.id)}
                      className={`flex items-center gap-1 ${
                        col.id === "added"
                          ? "font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          : "font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer`}
                    >
                      <span>{col.label}</span>
                      {isSorted ? (
                        <ArrowDown
                          className={`h-3 w-3 ${
                            col.id === "added"
                              ? "text-slate-700 dark:text-slate-300"
                              : ""
                          } transition-transform ${
                            sortDirection === "asc" ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 text-slate-400"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </th>
                );
              })}

              {visibleColumns.quickNotes && (
                <th
                  scope="col"
                  className="py-3 px-5 font-semibold text-slate-500"
                >
                  {t("candidates.columns.quickNotes")}
                </th>
              )}

              <th
                scope="col"
                className="py-3 px-5 text-right min-w-[100px] font-semibold text-slate-500"
              >
                {t("common.actions")}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {candidates.map((candidate) => (
              <CandidateTableRow
                key={candidate.id}
                candidate={candidate}
                visibleColumns={visibleColumns}
                canEdit={canEdit}
                onSelect={onSelectCandidate}
                onDelete={onDeleteCandidate}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination & Rows Footer */}
      <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={rowsPerPage}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={t("candidates.candidateName").toLowerCase()}
        />
      </div>
    </div>
  );
}
