"use client";

import { useRouter } from "next/navigation";
import { Mail, Phone, Eye, Pencil, Trash2 } from "lucide-react";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  formatDate,
  getCandidateDisplayName,
  type CandidateItem,
} from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { CandidateVisibleColumns } from "../toolbar/candidates-column-picker";

export interface CandidateTableRowProps {
  candidate: CandidateItem;
  visibleColumns: CandidateVisibleColumns;
  canEdit: boolean;
  onSelect: (candidate: CandidateItem) => void;
  onDelete: (candidate: CandidateItem) => void;
}

export function CandidateTableRow({
  candidate,
  visibleColumns,
  canEdit: _canEdit,
  onSelect,
  onDelete,
}: CandidateTableRowProps) {
  const router = useRouter();
  const { t } = useI18n();
  const canUpdateCandidate = useHasPermission("candidate:update");
  const canDeleteCandidate = useHasPermission("candidate:delete");

  return (
    <tr
      key={candidate.id}
      onClick={() => onSelect(candidate)}
      className="hover:bg-muted/40 transition-colors cursor-pointer"
    >
      {/* Name */}
      {visibleColumns.name && (
        <td className="py-4 px-5 font-semibold text-foreground">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(candidate);
            }}
            className="text-left font-semibold text-foreground hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer"
          >
            {getCandidateDisplayName(candidate.candidate ?? candidate)}
          </button>
        </td>
      )}

      {/* Email */}
      {visibleColumns.email && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-foreground/90">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{candidate.email}</span>
          </span>
        </td>
      )}

      {/* Phone */}
      {visibleColumns.phone && (
        <td className="py-4 px-5">
          {candidate.phone ? (
            <span className="inline-flex items-center gap-1.5 text-foreground/90">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{candidate.phone}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
      )}

      {/* Applications Count */}
      {visibleColumns.applications && (
        <td className="py-4 px-5 text-muted-foreground">
          {candidate.applicationsCount}
        </td>
      )}

      {/* Added Date */}
      {visibleColumns.added && (
        <td className="py-4 px-5 text-muted-foreground">
          {formatDate(candidate.createdAt)}
        </td>
      )}

      {/* Latest note */}
      {visibleColumns.quickNotes && (
        <td className="py-4 px-5 max-w-xs">
          {candidate.latestNote?.content ? (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block text-xs text-foreground/80 truncate max-w-[190px]"
                title={candidate.latestNote.content}
              >
                {candidate.latestNote.content}
              </span>
              {(candidate.notesCount ?? 0) > 1 && (
                <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground shrink-0">
                  +{candidate.notesCount! - 1}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
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
              router.push(`/candidates/${candidate.id}`);
            }}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={t("common.view")}
            aria-label={t("common.view")}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Quick Edit (Dedicated Edit Page) */}
          {canUpdateCandidate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/candidates/${candidate.id}/edit`);
              }}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={t("common.edit")}
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {/* Quick Delete */}
          {canDeleteCandidate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(candidate);
              }}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
