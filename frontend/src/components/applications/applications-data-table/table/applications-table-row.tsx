"use client";

import { useRouter } from "next/navigation";
import { Mail, Building2, Trash2, Eye } from "lucide-react";
import { formatRelativeTime, getStageInfo } from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import type { Application, Job } from "@/types";
import { useI18n } from "@/i18n";

interface ApplicationsTableRowProps {
  application: Application;
  job: Job | null;
  visibleColumns: {
    candidate: boolean;
    email: boolean;
    job: boolean;
    status: boolean;
    score: boolean;
    applied: boolean;
  };
  onSelectApp: (app: Application) => void;
  onDeleteApp: (app: Application) => void;
  canEdit?: boolean;
}

export function ApplicationsTableRow({
  application,
  job,
  visibleColumns,
  onSelectApp,
  onDeleteApp,
  canEdit,
}: ApplicationsTableRowProps) {
  const router = useRouter();
  const { t } = useI18n();
  const stageInfo = getStageInfo(application.stage);

  return (
    <tr
      onClick={() => onSelectApp(application)}
      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
    >
      {/* Candidate Name */}
      {visibleColumns.candidate && (
        <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
          <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {application.candidateName}
          </span>
        </td>
      )}

      {/* Email */}
      {visibleColumns.email && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{application.candidateEmail}</span>
          </span>
        </td>
      )}

      {/* Job */}
      {visibleColumns.job && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              {job?.title || t("candidates.role")}{" "}
              <span className="text-slate-400">
                ({getJobTypeLabel(job?.type, t)})
              </span>
            </span>
          </span>
        </td>
      )}

      {/* Status */}
      {visibleColumns.status && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span
              className={`h-1.5 w-1.5 rounded-full ${stageInfo.dotColor}`}
            />
            <span>{stageInfo.label}</span>
          </span>
        </td>
      )}

      {/* Score */}
      {visibleColumns.score && (
        <td className="py-4 px-5 text-slate-400">—</td>
      )}

      {/* Applied */}
      {visibleColumns.applied && (
        <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
          {formatRelativeTime(application.createdAt)}
        </td>
      )}

      {/* Actions */}
      <td className="py-4 px-5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {/* Quick View */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/applications/${application.id}`);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.view")}
          >
            <Eye className="h-4 w-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteApp(application);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center"
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
