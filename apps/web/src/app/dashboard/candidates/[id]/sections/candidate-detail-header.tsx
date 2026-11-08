import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

interface CandidateDetailHeaderProps {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  canEdit: boolean;
  isDeleting: boolean;
  onOpenSendEmail: () => void;
  onOpenDeleteModal: () => void;
}

export function CandidateDetailHeader({
  candidateId,
  candidateName,
  candidateEmail,
  candidatePhone,
  canEdit,
  isDeleting,
  onOpenSendEmail,
  onOpenDeleteModal,
}: CandidateDetailHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/candidates"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>
            {t("common.back")}: {t("candidates.title")}
          </span>
        </Link>
      </div>

      {/* Candidate Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {candidateName}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
            <a
              href={`mailto:${candidateEmail}`}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{candidateEmail}</span>
            </a>
            {candidatePhone && (
              <a
                href={`tel:${candidatePhone}`}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{candidatePhone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons (Admins only) */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onOpenSendEmail}
              className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{t("email.sendEmailAction")}</span>
            </Button>
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/candidates/${candidateId}/edit`)
              }
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Edit2 className="h-3 w-3 text-slate-400" />
              <span>{t("common.edit")}</span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onOpenDeleteModal}
              className="h-8 px-3 rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>{t("common.delete")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
