"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUpDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { ApplicationsTableRow } from "./applications-table-row";
import type { Application, Job } from "@/types";
import type { SortField, SortDirection } from "../types";
import { useI18n } from "@/i18n";

interface ApplicationsTableViewProps {
  baseApplications: Application[];
  paginatedApps: Application[];
  jobMap: Map<string, Job>;
  visibleColumns: {
    candidate: boolean;
    email: boolean;
    job: boolean;
    status: boolean;
    score: boolean;
    applied: boolean;
  };
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  onSelectApp: (app: Application) => void;
  onDeleteApp: (app: Application) => void;
  canEdit?: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  rowsPerPage: number;
  onPageChangeHandler: (page: number) => void;
  onPageSizeChangeHandler: (size: number) => void;
}

export function ApplicationsTableView({
  baseApplications,
  paginatedApps,
  jobMap,
  visibleColumns,
  sortField,
  sortDirection,
  handleSort,
  onSelectApp,
  onDeleteApp,
  canEdit,
  currentPage,
  totalPages,
  totalCount,
  rowsPerPage,
  onPageChangeHandler,
  onPageSizeChangeHandler,
}: ApplicationsTableViewProps) {
  const router = useRouter();
  const { t } = useI18n();

  if (baseApplications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card text-card-foreground px-6 py-12 sm:p-16 text-center shadow-xs w-full my-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
          <FileText className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {t("applications.noApplicationsYet")}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
          {t("applications.noApplicationsYetDesc")}
        </p>
        <Button
          onClick={() => router.push("/jobs")}
          className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
        >
          {t("applications.viewActiveJobs")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
            <tr>
              {/* Candidate */}
              {visibleColumns.candidate && (
                <th
                  scope="col"
                  aria-sort={
                    sortField === "candidate"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="py-3.5 px-4 sm:px-5 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("candidate")}
                    className={`flex items-center gap-1 ${
                      sortField === "candidate"
                        ? "font-bold text-foreground"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                  >
                    <span>{t("applications.columns.candidate")}</span>
                    {sortField === "candidate" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-foreground transition-transform ${
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
              )}

              {/* Email */}
              {visibleColumns.email && (
                <th
                  scope="col"
                  aria-sort={
                    sortField === "email"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="py-3.5 px-4 sm:px-5 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("email")}
                    className={`flex items-center gap-1 ${
                      sortField === "email"
                        ? "font-bold text-foreground"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                  >
                    <span>{t("applications.columns.email")}</span>
                    {sortField === "email" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-foreground transition-transform ${
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
              )}

              {/* Job */}
              {visibleColumns.job && (
                <th
                  scope="col"
                  aria-sort={
                    sortField === "job"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="py-3.5 px-4 sm:px-5 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("job")}
                    className={`flex items-center gap-1 ${
                      sortField === "job"
                        ? "font-bold text-foreground"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                  >
                    <span>{t("applications.columns.job")}</span>
                    {sortField === "job" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-foreground transition-transform ${
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
              )}

              {/* Status */}
              {visibleColumns.status && (
                <th
                  scope="col"
                  aria-sort={
                    sortField === "status"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="py-3.5 px-4 sm:px-5 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className={`flex items-center gap-1 ${
                      sortField === "status"
                        ? "font-bold text-foreground"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                  >
                    <span>{t("applications.columns.status")}</span>
                    {sortField === "status" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-foreground transition-transform ${
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
              )}

              {/* Score */}
              {visibleColumns.score && (
                <th
                  scope="col"
                  aria-sort={
                    sortField === "score"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="py-3.5 px-4 sm:px-5 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("score")}
                    className={`flex items-center gap-1 ${
                      sortField === "score"
                        ? "font-bold text-foreground"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                  >
                    <span>{t("applications.columns.score")}</span>
                    {sortField === "score" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-foreground transition-transform ${
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
              )}

              {/* Applied */}
              {visibleColumns.applied && (
                <th
                  scope="col"
                  aria-sort={
                    sortField === "applied"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="py-3.5 px-4 sm:px-5 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleSort("applied")}
                    className={`flex items-center gap-1 ${
                      sortField === "applied"
                        ? "font-bold text-foreground"
                        : "font-semibold text-muted-foreground hover:text-foreground"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer`}
                  >
                    <span>{t("applications.columns.applied")}</span>
                    {sortField === "applied" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-foreground transition-transform ${
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
              )}
              <th
                scope="col"
                className="py-3.5 px-4 sm:px-5 text-right min-w-[100px] font-semibold text-muted-foreground"
              >
                {t("common.actions")}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border">
            {paginatedApps.map((application) => (
              <ApplicationsTableRow
                key={application.id}
                application={application}
                job={
                  application.jobId
                    ? jobMap.get(application.jobId) || null
                    : null
                }
                visibleColumns={visibleColumns}
                onSelectApp={onSelectApp}
                onDeleteApp={onDeleteApp}
                canEdit={canEdit}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination & Rows Footer */}
      <div className="py-3 px-4 sm:px-5 border-t border-border bg-muted/30">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={rowsPerPage}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={onPageChangeHandler}
          onPageSizeChange={onPageSizeChangeHandler}
          itemLabel={t("nav.applications").toLowerCase()}
        />
      </div>
    </div>
  );
}
