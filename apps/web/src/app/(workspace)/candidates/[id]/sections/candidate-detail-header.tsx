import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

interface CandidateDetailHeaderProps {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  canEdit: boolean;
  isDeleting: boolean;
  onOpenDeleteModal: () => void;
}

export function CandidateDetailHeader({
  candidateId,
  candidateName,
  candidateEmail,
  candidatePhone,
  canEdit: _canEdit,
  isDeleting,
  onOpenDeleteModal,
}: CandidateDetailHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  const canUpdateCandidate = useHasPermission("candidate:update");
  const canDeleteCandidate = useHasPermission("candidate:delete");

  return (
    <div className="space-y-4">
      {/* Back Link */}
      <div>
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>
            {t("common.back")}: {t("candidates.title")}
          </span>
        </Link>
      </div>

      {/* Candidate Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground break-words">
            {candidateName}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <a
              href={`mailto:${candidateEmail}`}
              className="flex items-center gap-1 hover:text-foreground transition-colors min-w-0 break-all"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{candidateEmail}</span>
            </a>
            {candidatePhone && (
              <a
                href={`tel:${candidatePhone}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{candidatePhone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canUpdateCandidate && (
            <button
              type="button"
              onClick={() => router.push(`/candidates/${candidateId}/edit`)}
              className="h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("common.edit")}</span>
            </button>
          )}
          {canDeleteCandidate && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={onOpenDeleteModal}
              className="h-8 px-3 rounded-md border border-destructive/30 bg-background text-xs font-medium text-destructive hover:bg-destructive/10 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("common.delete")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
