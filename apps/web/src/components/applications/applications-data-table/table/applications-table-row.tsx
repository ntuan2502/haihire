"use client";

import { useRouter } from "next/navigation";
import { Mail, Building2, Trash2, Eye, Loader2 } from "lucide-react";
import {
  formatRelativeTime,
  getCandidateDisplayName,
  getStageInfo,
} from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import type { Application, Job } from "@/types";
import { useHasPermission } from "@/hooks/use-has-permission";
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
  const { t, locale } = useI18n();
  const canDeleteApplication = useHasPermission("application:delete");
  const stageInfo = getStageInfo(application.stage);
  const displayName = getCandidateDisplayName(application);

  return (
    <tr
      onClick={() => onSelectApp(application)}
      className="hover:bg-muted/50 transition-colors cursor-pointer"
    >
      {/* Candidate Name */}
      {visibleColumns.candidate && (
        <td className="py-4 px-5 font-semibold text-foreground">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectApp(application);
            }}
            className="text-left font-semibold text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer"
          >
            {displayName}
          </button>
        </td>
      )}

      {/* Email */}
      {visibleColumns.email && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{application.candidateEmail}</span>
          </span>
        </td>
      )}

      {/* Job */}
      {visibleColumns.job && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              {job?.title || t("candidates.role")}{" "}
              <span className="text-muted-foreground">
                ({getJobTypeLabel(job?.type, t)})
              </span>
            </span>
          </span>
        </td>
      )}

      {/* Status */}
      {visibleColumns.status && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
            <span
              className={`h-1.5 w-1.5 rounded-full ${stageInfo.dotColor}`}
            />
            <span>{stageInfo.label}</span>
          </span>
        </td>
      )}

      {/* Score */}
      {visibleColumns.score && (
        <td className="py-4 px-5 text-muted-foreground">
          {application.aiScoreStatus === "PENDING" ||
          application.aiScoreStatus === "PROCESSING" ? (
            <span
              title={t("applications.aiEvaluation.scoringInProgress")}
              className="inline-flex items-center gap-1 text-xs text-primary"
            >
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            </span>
          ) : typeof application.matchScore === "number" ? (
            <span className="font-mono tabular-nums font-medium text-foreground">
              {application.matchScore}%
            </span>
          ) : (
            "—"
          )}
        </td>
      )}

      {/* Applied */}
      {visibleColumns.applied && (
        <td className="py-4 px-5 text-muted-foreground">
          {formatRelativeTime(application.createdAt, {
            defaultLanguage: locale,
          })}
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
              router.push(`/applications/${application.id}`);
            }}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={t("common.view")}
            aria-label={`${t("common.view")}: ${displayName}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
          {canEdit && canDeleteApplication && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteApp(application);
              }}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={t("common.delete")}
              aria-label={`${t("common.delete")}: ${displayName}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
