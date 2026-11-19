"use client";

import Link from "next/link";
import { FileText, Star, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DetailModal } from "@/components/shared";
import { useLocalization } from "@/components/providers/localization-provider";
import { cn, getCandidateDisplayName } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { EventDetailsCard } from "../components/event-details-card";
import type { Application } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { CalendarEventItem } from "../types";

export interface EventDetailsModalProps {
  isOpen: boolean;
  selectedEvent: CalendarEventItem | null;
  onClose: () => void;
  onEditSchedule: (app: Application, interview: ScheduledInterviewInfo) => void;
  onOpenScorecard: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  onCancelInterview?: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  canEdit?: boolean;
}

export function EventDetailsModal({
  isOpen,
  selectedEvent,
  onClose,
  onEditSchedule,
  onOpenScorecard,
  onCancelInterview,
  canEdit = true,
}: EventDetailsModalProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;
  const canSubmitScorecard = useHasPermission("interview:scorecard_submit");

  const title = selectedEvent
    ? getCandidateDisplayName(selectedEvent.application, locOverrides)
    : t("common.details");

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={selectedEvent?.application.candidateEmail || undefined}
      badge={
        selectedEvent?.interview.round ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {t("interviews.round")} {selectedEvent.interview.round}
          </span>
        ) : undefined
      }
      footer={
        selectedEvent ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 rounded-md text-xs cursor-pointer"
              >
                {t("common.close")}
              </Button>
              <Link
                href={`/applications/${selectedEvent.application.id}`}
                onClick={onClose}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-8 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5",
                )}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("applications.viewApplication")}</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {onCancelInterview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const evt = selectedEvent;
                    onClose();
                    onCancelInterview(evt.application, evt.interview);
                  }}
                  className="h-8 rounded-md text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>{t("interviews.cancelThisSchedule")}</span>
                </Button>
              )}

              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const evt = selectedEvent;
                    onClose();
                    onEditSchedule(evt.application, evt.interview);
                  }}
                  className="h-8 rounded-md text-xs font-semibold cursor-pointer"
                >
                  {t("interviews.editSchedule")}
                </Button>
              )}

              {(Boolean(selectedEvent.interview.scorecard) ||
                canSubmitScorecard) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const evt = selectedEvent;
                    onClose();
                    onOpenScorecard(evt.application, evt.interview);
                  }}
                  className="h-8 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Star className="h-3 w-3" aria-hidden="true" />
                  <span>
                    {selectedEvent.interview.scorecard
                      ? t("interviews.viewEvaluation")
                      : t("interviews.scorecardAction")}
                  </span>
                </Button>
              )}
            </div>
          </div>
        ) : undefined
      }
      size="md"
      bodyClassName="p-5 bg-background space-y-4"
    >
      {selectedEvent && <EventDetailsCard event={selectedEvent} />}
    </DetailModal>
  );
}
