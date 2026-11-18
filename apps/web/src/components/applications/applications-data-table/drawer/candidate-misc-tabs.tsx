"use client";

import { Sparkles, FileCheck, Mail, Clock } from "lucide-react";
import { formatDate, getCandidateDisplayName } from "@/lib/utils";
import type { Application } from "@/types";
import { useI18n } from "@/i18n";

export function CandidateAiTab() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span>{t("applications.noAiAnalysis")}</span>
      </div>
      <button
        type="button"
        className="h-8 px-3.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        <span>{t("applications.runAnalysis")}</span>
      </button>
    </div>
  );
}

export function CandidateResponsesTab({
  currentApp,
}: {
  currentApp: Application;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
        <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{t("applications.sections.responses")}</span>
      </h3>
      <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2 text-muted-foreground">
        <div>
          <p className="text-[11px] text-muted-foreground">
            {t("candidates.displayName")}
          </p>
          <p className="font-semibold text-foreground">
            {getCandidateDisplayName(currentApp)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">
            {t("candidates.email")}
          </p>
          <p className="font-semibold text-foreground">
            {currentApp.candidateEmail}
          </p>
        </div>
        {currentApp.candidatePhone && (
          <div>
            <p className="text-[11px] text-muted-foreground">
              {t("candidates.phone")}
            </p>
            <p className="font-semibold text-foreground">
              {currentApp.candidatePhone}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CandidateInboxTab() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-8 text-center shadow-xs space-y-2">
      <Mail className="h-8 w-8 text-muted-foreground mx-auto" />
      <h4 className="text-xs font-bold text-foreground">
        {t("applications.tabs.inbox")}
      </h4>
      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
        {t("applications.noMessagesYetDesc")}
      </p>
    </div>
  );
}

export function CandidateTimelineTab({
  currentApp,
}: {
  currentApp: Application;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{t("applications.tabs.timeline")}</span>
      </h3>
      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        <div className="relative text-xs">
          <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />
          <p className="font-semibold text-foreground">
            {t("applications.applied")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDate(currentApp.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
