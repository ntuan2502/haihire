import { Calendar, Clock, MessageSquare } from "lucide-react";
import { getGenderLabel, parseCandidateNotes } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface CandidateProfileCardProps {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateNotes?: string | null;
  gender?: string | null;
  dob?: string | null;
  candidateCreated: string;
  candidateUpdated: string;
  parsedNotes: ReturnType<typeof parseCandidateNotes>;
}

export function CandidateProfileCard({
  candidateName,
  candidateEmail,
  candidatePhone,
  candidateNotes,
  gender,
  dob,
  candidateCreated,
  candidateUpdated,
  parsedNotes,
}: CandidateProfileCardProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
        {t("candidates.overviewTab")}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
        {/* First Name */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.firstName")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {parsedNotes.firstName || "—"}
          </span>
        </div>

        {/* Last Name */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.lastName")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {parsedNotes.lastName || "—"}
          </span>
        </div>

        {/* Display Name */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.displayName")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {parsedNotes.displayName || candidateName || "—"}
          </span>
        </div>

        {/* Email */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.email")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {candidateEmail}
          </span>
        </div>

        {/* Phone */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.phone")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {candidatePhone || "—"}
          </span>
        </div>

        {/* Gender */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.gender")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {getGenderLabel(gender, t)}
          </span>
        </div>

        {/* Date of Birth */}
        <div>
          <span className="text-slate-400 text-[11px] block">
            {t("candidates.dateOfBirth")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {dob}
          </span>
        </div>

        {/* Created */}
        <div>
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {t("candidates.columns.added")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {candidateCreated}
          </span>
        </div>

        {/* Updated */}
        <div>
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("common.updated")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
            {candidateUpdated}
          </span>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            {t("candidates.notes")}
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
            {parsedNotes.customNotes || candidateNotes || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
