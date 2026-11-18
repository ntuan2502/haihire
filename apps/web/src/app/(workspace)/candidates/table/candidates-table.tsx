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
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
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
                          ? "font-semibold text-foreground"
                          : "font-semibold text-muted-foreground hover:text-foreground"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                    >
                      <span>{col.label}</span>
                      {isSorted ? (
                        <ArrowDown
                          className={`h-3 w-3 ${
                            col.id === "added" ? "text-foreground" : ""
                          } transition-transform ${
                            sortDirection === "asc" ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 text-muted-foreground"
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
                  className="py-3 px-5 font-semibold text-muted-foreground"
                >
                  {t("candidates.columns.quickNotes")}
                </th>
              )}

              <th
                scope="col"
                className="py-3 px-5 text-right min-w-[100px] font-semibold text-muted-foreground"
              >
                {t("common.actions")}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border">
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
      <div className="py-3 px-5 border-t border-border bg-muted/30">
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
