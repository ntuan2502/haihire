"use client";

import React from "react";
import {
  Calendar,
  Clock,
  User,
  ExternalLink,
  MapPin,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  parseAllInterviewsFromNotes,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";

export interface CandidateInterviewsListProps {
  notes?: string | null;
  onSchedule?: () => void;
  onCancelInterview?: () => void;
  canEdit?: boolean;
  title?: string;
  showSectionHeader?: boolean;
  className?: string;
  hideIfEmpty?: boolean;
}

export function CandidateInterviewsList({
  notes,
  onSchedule,
  onCancelInterview,
  canEdit = true,
  title,
  showSectionHeader = true,
  className = "",
  hideIfEmpty = false,
}: CandidateInterviewsListProps) {
  const { t } = useI18n();
  const allInterviews = parseAllInterviewsFromNotes(notes);

  if (allInterviews.length === 0) {
    if (hideIfEmpty) {
      return null;
    }
    return (
      <div className={`space-y-4 ${className}`}>
        {showSectionHeader && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>{title || t("applications.sections.interviews")}</span>
            </h3>
            {canEdit && onSchedule && (
              <Button
                size="sm"
                onClick={onSchedule}
                className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>+ {t("applications.scheduleInterview")}</span>
              </Button>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
          <Calendar className="h-8 w-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t("applications.noInterviews")}
          </h4>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            {t("applications.noInterviewsDesc")}
          </p>
          {canEdit && onSchedule && (
            <Button
              size="sm"
              onClick={onSchedule}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{t("applications.scheduleInterview")}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showSectionHeader && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>
                {title ||
                  (allInterviews.length > 1
                    ? `Danh sách lịch phỏng vấn (${allInterviews.length})`
                    : "Lịch phỏng vấn")}
              </span>
            </h3>
            {allInterviews.length > 1 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                Mới nhất trên cùng
              </span>
            )}
          </div>

          {canEdit && onSchedule && (
            <Button
              size="sm"
              onClick={onSchedule}
              className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>+ Lên lịch phỏng vấn mới</span>
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {allInterviews.map((scheduled, idx) => (
          <div
            key={`${scheduled.date}-${scheduled.time}-${idx}`}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {scheduled.type}
                    </h4>
                    {allInterviews.length > 1 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                        {scheduled.round
                          ? `Vòng ${scheduled.round}`
                          : `Lịch #${allInterviews.length - idx}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {idx === 0
                      ? "Lịch phỏng vấn gần nhất / sắp tới"
                      : "Lịch phỏng vấn vòng trước"}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                {idx === 0 ? "Lịch hiện tại" : "Đã hoàn thành"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block">Thời gian:</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  {scheduled.date} lúc {scheduled.time}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">Hình thức:</span>
                {scheduled.format === "OFFICE" ? (
                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    Tại văn phòng công ty
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    Trực tuyến ({scheduled.format})
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">Người phỏng vấn:</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {scheduled.interviewer}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">
                  {scheduled.format === "OFFICE"
                    ? "Địa điểm:"
                    : "Đường dẫn phòng họp:"}
                </span>
                {scheduled.linkOrLocation &&
                scheduled.linkOrLocation.startsWith("http") ? (
                  <a
                    href={scheduled.linkOrLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>Vào phòng họp</span>
                  </a>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {scheduled.linkOrLocation || "—"}
                  </span>
                )}
              </div>
            </div>

            {scheduled.notes && (
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                <span className="font-bold text-blue-950 dark:text-blue-200">
                  Ghi chú kèm theo:
                </span>
                <p className="text-blue-800 dark:text-blue-300">
                  {scheduled.notes}
                </p>
              </div>
            )}

            {canEdit && (
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {idx === 0 && onCancelInterview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelInterview}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                  >
                    Hủy lịch này
                  </Button>
                )}
                {onSchedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSchedule}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    {idx === 0 ? "Chỉnh sửa lịch phỏng vấn" : "Cập nhật"}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
