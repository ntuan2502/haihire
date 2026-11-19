"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailModal } from "@/components/shared";
import { getCandidateDisplayName, getInitials } from "@/lib/utils";
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
  canEdit?: boolean;
}

export function EventDetailsModal({
  isOpen,
  selectedEvent,
  onClose,
  onEditSchedule,
  onOpenScorecard,
  canEdit = true,
}: EventDetailsModalProps) {
  const { t } = useI18n();
  const canSubmitScorecard = useHasPermission("interview:scorecard_submit");

  const title = selectedEvent
    ? getCandidateDisplayName(selectedEvent.application)
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
      headerActions={
        selectedEvent ? (
          <div
            aria-hidden="true"
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground font-black text-[11px] flex items-center justify-center shadow-xs shrink-0"
          >
            {getInitials(title)}
          </div>
        ) : undefined
      }
      footer={
        selectedEvent ? (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 rounded-md text-xs cursor-pointer"
            >
              {t("common.close")}
            </Button>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
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
