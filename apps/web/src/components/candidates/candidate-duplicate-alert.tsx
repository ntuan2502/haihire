"use client";

import Link from "next/link";
import type {
  CandidateDuplicateCheckResult,
  CandidateDuplicateMatch,
  CandidateDuplicateReason,
} from "@haihire/shared";
import { AlertCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n";

interface CandidateDuplicateAlertProps {
  result?: CandidateDuplicateCheckResult;
  mode?: "form" | "detail";
}

function getReasonLabel(
  reason: CandidateDuplicateReason,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (reason) {
    case "EMAIL":
      return t("candidates.duplicate.reasonEmail");
    case "PHONE":
      return t("candidates.duplicate.reasonPhone");
    case "NAME_DOB":
      return t("candidates.duplicate.reasonNameDob");
  }
}

interface AlertBannerProps {
  severity: "BLOCKING" | "WARNING";
  title: string;
  description: string;
  matches: CandidateDuplicateMatch[];
  viewProfileLabel: string;
  t: ReturnType<typeof useI18n>["t"];
}

function DuplicateAlertBanner({
  severity,
  title,
  description,
  matches,
  viewProfileLabel,
  t,
}: AlertBannerProps) {
  if (matches.length === 0) return null;

  const isBlocking = severity === "BLOCKING";
  const Icon = isBlocking ? AlertCircle : AlertTriangle;
  const containerClass = isBlocking
    ? "bg-destructive/10 border-destructive/30 text-destructive"
    : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300";
  const badgeClass = isBlocking
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  const itemClass = isBlocking
    ? "border-destructive/20 bg-background/70"
    : "border-amber-500/20 bg-background/70";

  return (
    <div
      role={isBlocking ? "alert" : "status"}
      data-testid={
        isBlocking
          ? "candidate-duplicate-blocking-alert"
          : "candidate-duplicate-warning-alert"
      }
      className={`rounded-lg border p-3.5 text-xs space-y-2.5 ${containerClass}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">{title}</p>
          <p className="text-[11px] opacity-90">{description}</p>
        </div>
      </div>

      <ul className="space-y-1.5 pl-6">
        {matches.map((match) => (
          <li
            key={match.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-foreground ${itemClass}`}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold truncate">{match.name}</span>
                {match.matchReasons.map((reason) => (
                  <span
                    key={reason}
                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
                  >
                    {getReasonLabel(reason, t)}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{match.email}</span>
                {match.phone && <span>{match.phone}</span>}
              </div>
            </div>

            <Link
              href={`/candidates/${match.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
            >
              <span>{viewProfileLabel}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CandidateDuplicateAlert({
  result,
  mode = "form",
}: CandidateDuplicateAlertProps) {
  const { t } = useI18n();

  if (!result || result.matches.length === 0) {
    return null;
  }

  const blockingMatches = result.matches.filter(
    (m) => m.severity === "BLOCKING",
  );
  const warningMatches = result.matches.filter((m) => m.severity === "WARNING");

  const viewProfileLabel = t("candidates.duplicate.viewProfile");

  return (
    <div className="space-y-3">
      <DuplicateAlertBanner
        severity="BLOCKING"
        title={t("candidates.duplicate.blockingTitle")}
        description={t("candidates.duplicate.blockingDesc")}
        matches={blockingMatches}
        viewProfileLabel={viewProfileLabel}
        t={t}
      />
      <DuplicateAlertBanner
        severity="WARNING"
        title={
          mode === "detail"
            ? t("candidates.duplicate.detailWarningTitle")
            : t("candidates.duplicate.warningTitle")
        }
        description={
          mode === "detail"
            ? t("candidates.duplicate.detailWarningDesc")
            : t("candidates.duplicate.warningDesc")
        }
        matches={warningMatches}
        viewProfileLabel={viewProfileLabel}
        t={t}
      />
    </div>
  );
}
