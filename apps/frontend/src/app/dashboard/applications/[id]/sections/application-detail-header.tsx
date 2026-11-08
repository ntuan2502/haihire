import { Mail, Phone, ArrowRight, Clock, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/shared/stage-badge";
import { useI18n } from "@/i18n";
import type { ApplicationStage } from "@/types";

interface ApplicationDetailHeaderProps {
  initials: string;
  candidateName: string;
  stage?: ApplicationStage;
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
  candidateEmail,
  candidatePhone,
  jobTitle,
  appliedDate,
  onOpenSendEmail,
}: ApplicationDetailHeaderProps) {
  const { t } = useI18n();

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
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
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
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onOpenSendEmail}
          className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          <span>{t("email.sendEmailAction")}</span>
        </Button>
        <button
          type="button"
          className="h-8 w-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center shadow-xs cursor-pointer"
          title={t("applications.compare")}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
