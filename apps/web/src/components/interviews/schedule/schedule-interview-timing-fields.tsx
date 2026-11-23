"use client";

import {
  Calendar,
  Clock,
  Layers,
  Link as LinkIcon,
  MapPin,
  Video,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared";
import { INTERVIEW_TYPE_OPTIONS } from "@/lib/interviews";
import { useI18n } from "@/i18n";
import type { InterviewFormat, InterviewType } from "@/types";

interface ScheduleInterviewTimingFieldsProps {
  interviewDate: string;
  onDateChange: (val: string) => void;
  interviewTime: string;
  onTimeChange: (val: string) => void;
  interviewType: InterviewType | "";
  onTypeChange: (val: InterviewType) => void;
  interviewFormat: InterviewFormat | "";
  onFormatChange: (val: InterviewFormat) => void;
  linkOrLocation: string;
  onLinkOrLocationChange: (val: string) => void;
  disabled?: boolean;
}

export function ScheduleInterviewTimingFields({
  interviewDate,
  onDateChange,
  interviewTime,
  onTimeChange,
  interviewType,
  onTypeChange,
  interviewFormat,
  onFormatChange,
  linkOrLocation,
  onLinkOrLocationChange,
  disabled = false,
}: ScheduleInterviewTimingFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="schedule-interview-date"
            className="text-xs font-bold text-foreground flex items-center gap-1"
          >
            <Calendar
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>
              {t("interviews.interviewDate")}{" "}
              <span className="text-rose-500">*</span>
            </span>
          </label>
          <Input
            id="schedule-interview-date"
            type="date"
            value={interviewDate}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={disabled}
            className="h-10 rounded-md text-xs bg-background border-input"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="schedule-interview-time"
            className="text-xs font-bold text-foreground flex items-center gap-1"
          >
            <Clock
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>
              {t("interviews.interviewTime")}{" "}
              <span className="text-rose-500">*</span>
            </span>
          </label>
          <Input
            id="schedule-interview-time"
            type="time"
            value={interviewTime}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={disabled}
            className="h-10 rounded-md text-xs bg-background border-input"
          />
        </div>
      </div>

      {/* Round & Format Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1">
            <Layers
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>
              {t("interviews.roundType")}{" "}
              <span className="text-rose-500">*</span>
            </span>
          </label>
          <CustomSelect
            value={interviewType}
            onChange={(val) => onTypeChange(val as InterviewType)}
            disabled={disabled}
            placeholder={t("interviews.placeholders.selectRoundType")}
            options={INTERVIEW_TYPE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(opt.labelKey),
            }))}
            className="w-full"
            triggerClassName="h-10 text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1">
            {interviewFormat === "OFFICE" ? (
              <MapPin
                className="h-3.5 w-3.5 text-rose-500"
                aria-hidden="true"
              />
            ) : (
              <Video
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
            )}
            <span>
              {t("interviews.formatLabel")}{" "}
              <span className="text-rose-500">*</span>
            </span>
          </label>
          <CustomSelect
            value={interviewFormat}
            onChange={(val) => onFormatChange(val as InterviewFormat)}
            disabled={disabled}
            placeholder={t("interviews.placeholders.selectFormat")}
            options={[
              { value: "MEET", label: t("interviews.formats.meet") },
              { value: "ZOOM", label: t("interviews.formats.zoom") },
              { value: "TEAMS", label: t("interviews.formats.teams") },
              { value: "OFFICE", label: t("interviews.formats.office") },
            ]}
            className="w-full"
            triggerClassName="h-10 text-xs font-medium"
          />
        </div>
      </div>

      {/* Meeting Link or Office Location */}
      <div className="space-y-1.5">
        <label
          htmlFor="schedule-interview-location"
          className="text-xs font-bold text-foreground flex items-center gap-1"
        >
          <LinkIcon
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span>
            {interviewFormat === "OFFICE"
              ? t("interviews.officeAddressLabel")
              : t("interviews.meetingUrlLabel")}
          </span>
        </label>
        <Input
          id="schedule-interview-location"
          type="text"
          placeholder={
            interviewFormat === "OFFICE"
              ? t("interviews.placeholders.officeLocation")
              : t("interviews.placeholders.meetingUrl")
          }
          value={linkOrLocation}
          onChange={(e) => onLinkOrLocationChange(e.target.value)}
          disabled={disabled}
          className="h-10 rounded-md text-xs bg-background border-input"
        />
      </div>
    </div>
  );
}
