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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
          <FileText className="h-8 w-8 stroke-[1.5]" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {t("applications.noApplicationsYet")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
          {t("applications.noApplicationsYetDesc")}
        </p>
        <Button
          onClick={() => router.push("/dashboard/jobs")}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
        >
          {t("applications.viewActiveJobs")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
            <tr>
              {/* Candidate */}
              {visibleColumns.candidate && (
                <th
                  onClick={() => handleSort("candidate")}
                  className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span className="flex items-center gap-1">
                    {t("applications.columns.candidate")}
                    {sortField === "candidate" ? (
                      <ArrowDown
                        className={`h-3 w-3 transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </span>
                </th>
              )}

              {/* Email */}
              {visibleColumns.email && (
                <th
                  onClick={() => handleSort("email")}
                  className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span className="flex items-center gap-1">
                    {t("applications.columns.email")}
                    {sortField === "email" ? (
                      <ArrowDown
                        className={`h-3 w-3 transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </span>
                </th>
              )}

              {/* Job */}
              {visibleColumns.job && (
                <th
                  onClick={() => handleSort("job")}
                  className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span className="flex items-center gap-1">
                    {t("applications.columns.job")}
                    {sortField === "job" ? (
                      <ArrowDown
                        className={`h-3 w-3 transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </span>
                </th>
              )}

              {/* Status */}
              {visibleColumns.status && (
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span className="flex items-center gap-1">
                    {t("applications.columns.status")}
                    {sortField === "status" ? (
                      <ArrowDown
                        className={`h-3 w-3 transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </span>
                </th>
              )}

              {/* Score */}
              {visibleColumns.score && (
                <th
                  onClick={() => handleSort("score")}
                  className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span className="flex items-center gap-1">
                    {t("applications.columns.score")}
                    {sortField === "score" ? (
                      <ArrowDown
                        className={`h-3 w-3 transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </span>
                </th>
              )}

              {/* Applied */}
              {visibleColumns.applied && (
                <th
                  onClick={() => handleSort("applied")}
                  className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                    {t("applications.columns.applied")}
                    {sortField === "applied" ? (
                      <ArrowDown
                        className={`h-3 w-3 text-slate-700 dark:text-slate-300 transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </span>
                </th>
              )}
              <th className="py-3 px-5 text-right min-w-[100px] font-semibold text-slate-500">
                {t("common.actions")}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedApps.map((application) => (
              <ApplicationsTableRow
                key={application.id}
                application={application}
                job={application.jobId ? jobMap.get(application.jobId) || null : null}
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
      <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
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
