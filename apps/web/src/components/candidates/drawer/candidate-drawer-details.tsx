"use client";

import { Calendar, Clock, Mail, Phone } from "lucide-react";
import { formatDate, type CandidateItem } from "@/lib/utils";
import { useI18n } from "@/i18n";

export interface CandidateDrawerDetailsProps {
  candidate: CandidateItem;
  details: {
    gender: string;
    dob: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

export function CandidateDrawerDetails({
  candidate,
  details,
}: CandidateDrawerDetailsProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Candidate Name & Contact Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {candidate.name}
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            {candidate.email}
          </span>
          {candidate.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {candidate.phone}
            </span>
          )}
        </div>
      </div>

      {/* Card 1: Details */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {t("common.details")}
        </h3>

        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.firstName")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
              {details.firstName || "—"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.lastName")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
              {details.lastName || "—"}
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.displayName")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
              {details.displayName || candidate.name || "—"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.email")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
              {candidate.email}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.phone")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
              {candidate.phone || "—"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.gender")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
              {details.gender}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">
              {t("candidates.dateOfBirth")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
              {details.dob}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t("common.created")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
              {formatDate(candidate.createdAt, "short")}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("common.updated")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
              {formatDate(candidate.updatedAt || candidate.createdAt, "short")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
