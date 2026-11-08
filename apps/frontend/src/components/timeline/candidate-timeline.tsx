"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Mail,
  Calendar,
  ArrowRightCircle,
  Star,
  MessageSquare,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { type ActivityEvent } from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

import { useCandidateActivities } from "@/hooks/use-queries";

interface CandidateTimelineProps {
  candidateId?: string;
  applicationId?: string;
  candidateName?: string;
  candidateEmail?: string;
  initialEvents?: ActivityEvent[];
  className?: string;
}

export function CandidateTimeline({
  candidateId,
  applicationId: _applicationId,
  candidateName: _candidateName,
  candidateEmail: _candidateEmail,
  initialEvents,
  className = "",
}: CandidateTimelineProps) {
  const { t } = useI18n();

  const { data: remoteActivities } = useCandidateActivities(candidateId);

  const [filter, setFilter] = useState<"ALL" | "EMAIL" | "INTERVIEW" | "STAGE">("ALL");
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

  // Use real backend activities, or initial events
  const events = useMemo(() => {
    if (remoteActivities?.data && remoteActivities.data.length > 0) {
      return remoteActivities.data;
    }
    return initialEvents || [];
  }, [remoteActivities, initialEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filter === "EMAIL") return ev.type === "EMAIL_SENT";
      if (filter === "INTERVIEW")
        return (
          ev.type === "INTERVIEW_SCHEDULED" ||
          ev.type === "INTERVIEW_UPDATED" ||
          ev.type === "SCORECARD_SUBMITTED"
        );
      if (filter === "STAGE")
        return ev.type === "STAGE_CHANGED" || ev.type === "APPLIED";
      return true;
    });
  }, [events, filter]);

  const toggleExpand = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getEventIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "APPLIED":
        return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "STAGE_CHANGED":
        return <ArrowRightCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "EMAIL_SENT":
        return <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "INTERVIEW_SCHEDULED":
      case "INTERVIEW_UPDATED":
        return <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "SCORECARD_SUBMITTED":
        return <Star className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "NOTE_ADDED":
        return <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getBadgeClass = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "APPLIED":
        return "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-900/50 dark:text-blue-300";
      case "STAGE_CHANGED":
        return "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/50 dark:border-purple-900/50 dark:text-purple-300";
      case "EMAIL_SENT":
        return "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-900/50 dark:text-emerald-300";
      case "INTERVIEW_SCHEDULED":
      case "INTERVIEW_UPDATED":
        return "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-900/50 dark:text-amber-300";
      case "SCORECARD_SUBMITTED":
        return "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-900/50 dark:text-indigo-300";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
    }
  };
  const getLocalizedTimelineEvent = (event: ActivityEvent) => {
    const meta = (event.metadata || {}) as Record<string, unknown>;
    const subType = (meta.subType || meta.action || meta.accessType) as string | undefined;
    const eventKey = subType || event.type;

    let fromStageLabel = meta.fromStage ? String(meta.fromStage) : "";
    let toStageLabel = meta.toStage ? String(meta.toStage) : "";
    if (fromStageLabel) {
      const stageKey = `pipeline.stages.${fromStageLabel.toLowerCase()}`;
      const trans = t(stageKey);
      if (trans && trans !== stageKey) fromStageLabel = trans;
    }
    if (toStageLabel) {
      const stageKey = `pipeline.stages.${toStageLabel.toLowerCase()}`;
      const trans = t(stageKey);
      if (trans && trans !== stageKey) toStageLabel = trans;
    }

    const interpolationParams: Record<string, string | number> = {
      userName: (meta.userName as string) || event.actorName || "Recruiter",
      interviewer: (meta.interviewer as string) || event.actorName || "Interviewer",
      fromStage: fromStageLabel,
      toStage: toStageLabel,
      recipientName: (meta.recipientName as string) || event.actorName || "",
      recipientEmail: (meta.recipientEmail as string) || "",
      round: Number(meta.round) || 1,
      time: (meta.time as string) || "",
      date: (meta.date as string) || "",
      jobTitle: (meta.jobTitle as string) || "",
      fileName: (meta.fileName as string) || "",
      subject: (meta.subject as string) || "",
    };

    const titleKey = `timeline.events.${eventKey}_title`;
    const descKey = `timeline.events.${eventKey}_desc`;

    const localizedTitle = t(titleKey, interpolationParams);
    const localizedDesc = t(descKey, interpolationParams);

    return {
      title: localizedTitle && localizedTitle !== titleKey ? localizedTitle : event.title,
      description: localizedDesc && localizedDesc !== descKey ? localizedDesc : event.description,
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Filter pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{t("timeline.title")}</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("timeline.subtitle")}
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {t("timeline.allEvents")}
          </button>
          <button
            type="button"
            onClick={() => setFilter("EMAIL")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === "EMAIL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {t("timeline.filterEmails")}
          </button>
          <button
            type="button"
            onClick={() => setFilter("INTERVIEW")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === "INTERVIEW"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {t("timeline.filterInterviews")}
          </button>
          <button
            type="button"
            onClick={() => setFilter("STAGE")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === "STAGE"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {t("timeline.filterStages")}
          </button>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
          <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t("timeline.noEvents")}
          </h4>
          <p className="text-[11px] text-slate-400">
            {t("timeline.noEventsDesc")}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredEvents.map((event) => {
            const isExpanded = expandedEventIds.has(event.id);
            const { title, description } = getLocalizedTimelineEvent(event);
            return (
              <div key={event.id} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-4 ring-slate-50 dark:ring-slate-950 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {getEventIcon(event.type)}
                </div>

                {/* Event Card */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 dark:border-slate-800/90 dark:bg-slate-900/90 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeClass(
                            event.type,
                          )}`}
                        >
                          {title}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {event.timestamp || ((event as { createdAt?: string }).createdAt ? new Date((event as { createdAt?: string }).createdAt!).toLocaleDateString() : "")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {description}
                      </p>
                    </div>

                    {event.type === "EMAIL_SENT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(event.id)}
                        className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>
                          {isExpanded
                            ? t("timeline.hideEmailBody")
                            : t("timeline.viewEmailBody")}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expandable Preview for Email body or details */}
                  {isExpanded && event.type === "EMAIL_SENT" && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-3 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2 font-mono">
                        <div className="flex items-center gap-2 text-[11px] font-sans text-slate-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{t("timeline.deliveredViaProvider")}</span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200">
                          {((event.metadata?.body as string) ||
                            (event.metadata?.subject as string) ||
                            event.description ||
                            t("timeline.noEmailPreview"))}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actor Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/80 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>{t("timeline.performedBy")}:</span>
                      <strong className="font-semibold text-slate-600 dark:text-slate-400">
                        {event.actorName}
                      </strong>
                      {event.actorRole && (
                        <span className="text-[10px] text-slate-400">({event.actorRole})</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
