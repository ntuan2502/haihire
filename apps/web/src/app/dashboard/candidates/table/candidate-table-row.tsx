"use client";

import { useRouter } from "next/navigation";
import { Mail, Phone, Eye, Pencil, Trash2 } from "lucide-react";
import { formatDate, type CandidateItem } from "@/lib/utils";
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
  canEdit,
  onSelect,
  onDelete,
}: CandidateTableRowProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <tr
      key={candidate.id}
      onClick={() => onSelect(candidate)}
      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
    >
      {/* Name */}
      {visibleColumns.name && (
        <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(candidate);
            }}
            className="text-left font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
          >
            {candidate.name}
          </button>
        </td>
      )}

      {/* Email */}
      {visibleColumns.email && (
        <td className="py-4 px-5">
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{candidate.email}</span>
          </span>
        </td>
      )}

      {/* Phone */}
      {visibleColumns.phone && (
        <td className="py-4 px-5">
          {candidate.phone ? (
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{candidate.phone}</span>
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )}
        </td>
      )}

      {/* Applications Count */}
      {visibleColumns.applications && (
        <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
          {candidate.applicationsCount}
        </td>
      )}

      {/* Added Date */}
      {visibleColumns.added && (
        <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
          {formatDate(candidate.createdAt)}
        </td>
      )}

      {/* Quick notes */}
      {visibleColumns.quickNotes && (
        <td className="py-4 px-5 max-w-xs">
          {candidate.notes ? (
            <span
              className="inline-block text-xs text-slate-600 dark:text-slate-300 truncate max-w-[220px]"
              title={candidate.notes}
            >
              {candidate.notes}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
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
              router.push(`/dashboard/candidates/${candidate.id}`);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.view")}
            aria-label={t("common.view")}
          >
            <Eye className="h-4 w-4" />
          </button>

          {/* Quick Edit (Dedicated Edit Page) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/candidates/${candidate.id}/edit`);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.edit")}
            aria-label={t("common.edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>

          {/* Quick Delete */}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(candidate);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center"
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
