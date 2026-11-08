import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/shared";
import { getCandidateDisplayName, getInitials } from "@/lib/utils";
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

  const title = selectedEvent
    ? getCandidateDisplayName(selectedEvent.application)
    : "";

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      badge={
        selectedEvent?.interview.round ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {t("interviews.round")} {selectedEvent.interview.round}
          </span>
        ) : undefined
      }
      size="md"
      contentClassName="p-5 flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-[#1a1a1a] space-y-4"
    >
      {selectedEvent && (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {getInitials(
                  getCandidateDisplayName(selectedEvent.application),
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {getCandidateDisplayName(selectedEvent.application)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedEvent.application.candidateEmail}
                </p>
              </div>
            </div>
          </div>

          <EventDetailsCard event={selectedEvent} />

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 rounded-xl text-xs cursor-pointer"
            >
              {t("common.close")}
            </Button>

            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const evt = selectedEvent;
                    onClose();
                    onEditSchedule(evt.application, evt.interview);
                  }}
                  className="h-8 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {t("interviews.editSchedule")}
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => {
                  const evt = selectedEvent;
                  onClose();
                  onOpenScorecard(evt.application, evt.interview);
                }}
                className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Star className="h-3 w-3" />
                <span>
                  {selectedEvent.interview.scorecard
                    ? t("interviews.updateSchedule")
                    : t("interviews.scorecardAction")}
                </span>
              </Button>
            </div>
          </div>
        </>
      )}
    </CustomModal>
  );
}
