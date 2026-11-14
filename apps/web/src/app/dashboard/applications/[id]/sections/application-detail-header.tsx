import { Mail, Phone, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/shared/stage-badge";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import type { ApplicationStage } from "@/types";

interface ApplicationDetailHeaderProps {
  initials: string;
  candidateName: string;
  stage?: ApplicationStage;
  rejectionReason?: string | null;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  appliedDate: string;
  onOpenSendEmail: () => void;
}

export function ApplicationDetailHeader({
  initials,
  candidateName,
  stage,
  rejectionReason,
  candidateEmail,
  candidatePhone,
  jobTitle,
  appliedDate,
  onOpenSendEmail,
}: ApplicationDetailHeaderProps) {
  const { t } = useI18n();
  const canSendEmail = useHasPermission("email:send");

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {candidateName}
            </h1>
            <StageBadge stage={stage} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <a
              href={`mailto:${candidateEmail}`}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{candidateEmail}</span>
            </a>
            {candidatePhone && (
              <a
                href={`tel:${candidatePhone}`}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{candidatePhone}</span>
              </a>
            )}
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
              <ArrowRight className="h-3 w-3 text-slate-400" />
              {jobTitle}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
            <Clock className="h-3 w-3" />
            <span>
              {t("applications.applied")} {appliedDate}
            </span>
          </p>
          {stage === "REJECTED" && rejectionReason && (
            <div className="mt-2 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-300">
              <span className="font-medium">
                {t("applications.rejectionReasonLabel")}:{" "}
              </span>
              <span>{rejectionReason}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canSendEmail && (
          <Button
            type="button"
            size="sm"
            onClick={onOpenSendEmail}
            className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>{t("email.sendEmailAction")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
