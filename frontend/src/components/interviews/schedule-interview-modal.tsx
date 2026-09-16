"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Briefcase,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUpdateCandidateMutation, useUpdateStageMutation } from "@/hooks/use-queries";
import { getCandidateDisplayName } from "@/lib/utils";
import {
  type ScheduledInterviewInfo,
  parseInterviewFromNotes,
  stringifyInterviewToNotes,
} from "@/lib/interviews";
import type { Application, Job } from "@/types";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs?: Job[];
  applications?: Application[];
  selectedJobId?: string;
  selectedApplicationId?: string;
  onInterviewScheduled?: (interviewInfo: ScheduledInterviewInfo) => void;
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  jobs = [],
  applications = [],
  selectedJobId,
  selectedApplicationId,
  onInterviewScheduled,
}: ScheduleInterviewModalProps) {
  const { user } = useAuth();
  const updateCandidateMutation = useUpdateCandidateMutation();
  const updateStageMutation = useUpdateStageMutation();

  const [modalJobId, setModalJobId] = useState<string>("");
  const [modalCandidateId, setModalCandidateId] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState<string>("");
  const [interviewTime, setInterviewTime] = useState<string>("10:00");
  const [interviewType, setInterviewType] = useState<string>("Kỹ thuật (Technical)");
  const [interviewFormat, setInterviewFormat] = useState<"MEET" | "ZOOM" | "TEAMS" | "OFFICE">("MEET");
  const [linkOrLocation, setLinkOrLocation] = useState<string>("https://meet.google.com/");
  const [interviewerName, setInterviewerName] = useState<string>("");
  const [interviewNotes, setInterviewNotes] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Filter candidates for selected job
  const modalCandidates = useMemo(() => {
    if (!modalJobId) return applications;
    return applications.filter((app) => String(app.jobId) === String(modalJobId));
  }, [applications, modalJobId]);

  // Current selected candidate
  const currentCandidate = useMemo(() => {
    return applications.find((a) => a.id === modalCandidateId);
  }, [applications, modalCandidateId]);

  // Sync state when modal opens or selections change
  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);

    // 1. Determine target candidate & job
    let candidateToUse: Application | undefined;
    if (selectedApplicationId) {
      candidateToUse = applications.find((a) => a.id === selectedApplicationId);
    }

    const initialJobId =
      selectedJobId ||
      candidateToUse?.jobId ||
      jobs[0]?.id ||
      "";
    setModalJobId(initialJobId);

    const initialCandId =
      selectedApplicationId ||
      (initialJobId
        ? applications.find((a) => String(a.jobId) === String(initialJobId))?.id
        : applications[0]?.id) ||
      "";
    setModalCandidateId(initialCandId);

    // 2. Check if candidate has existing interview schedule
    const candidateObj = candidateToUse || applications.find((a) => a.id === initialCandId);
    const existing = candidateObj ? parseInterviewFromNotes(candidateObj.notes) : null;

    if (existing) {
      setInterviewDate(existing.date);
      setInterviewTime(existing.time || "10:00");
      setInterviewType(existing.type || "Kỹ thuật (Technical)");
      setInterviewFormat(existing.format || "MEET");
      setLinkOrLocation(existing.linkOrLocation || "https://meet.google.com/");
      setInterviewerName(existing.interviewer || user?.name || "Hiring Team");
      setInterviewNotes(existing.notes || "");
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setInterviewDate(tomorrow.toISOString().split("T")[0]);
      setInterviewTime("10:00");
      setInterviewType("Kỹ thuật (Technical)");
      setInterviewFormat("MEET");
      setLinkOrLocation("https://meet.google.com/");
      setInterviewerName(user?.name || "Hiring Team");
      setInterviewNotes("");
    }
  }, [isOpen, selectedJobId, selectedApplicationId, jobs, applications, user?.name]);

  // When candidate changes manually, re-populate existing interview if any
  const handleCandidateChange = (candId: string) => {
    setModalCandidateId(candId);
    const candidate = applications.find((a) => a.id === candId);
    const existing = candidate ? parseInterviewFromNotes(candidate.notes) : null;
    if (existing) {
      setInterviewDate(existing.date);
      setInterviewTime(existing.time || "10:00");
      setInterviewType(existing.type || "Kỹ thuật (Technical)");
      setInterviewFormat(existing.format || "MEET");
      setLinkOrLocation(existing.linkOrLocation || "https://meet.google.com/");
      setInterviewerName(existing.interviewer || user?.name || "Hiring Team");
      setInterviewNotes(existing.notes || "");
    }
  };

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!modalCandidateId) {
      setFormError("Vui lòng chọn ứng viên.");
      return;
    }
    if (!interviewDate) {
      setFormError("Vui lòng chọn ngày phỏng vấn.");
      return;
    }

    const candidate = applications.find((a) => a.id === modalCandidateId);
    if (!candidate) {
      setFormError("Không tìm thấy thông tin ứng viên.");
      return;
    }

    const interviewInfo: ScheduledInterviewInfo = {
      date: interviewDate,
      time: interviewTime,
      type: interviewType,
      format: interviewFormat,
      linkOrLocation: linkOrLocation.trim(),
      interviewer: interviewerName.trim(),
      notes: interviewNotes.trim(),
    };

    const updatedNotes = stringifyInterviewToNotes(candidate.notes, interviewInfo);

    try {
      // 1. Update candidate notes with interview metadata
      await updateCandidateMutation.mutateAsync({
        id: candidate.id,
        data: {
          notes: updatedNotes,
        },
      });

      // 2. If candidate is still in APPLIED/SCREENING stage, advance to INTERVIEW stage
      if (candidate.stage !== "INTERVIEW" && candidate.stage !== "OFFER" && candidate.stage !== "HIRED") {
        await updateStageMutation.mutateAsync({
          id: candidate.id,
          stage: "INTERVIEW",
          orderIndex: 0,
        });
      }

      onInterviewScheduled?.(interviewInfo);
      onClose();
    } catch (err) {
      console.error("Schedule interview failed:", err);
      setFormError("Có lỗi xảy ra khi lưu lịch phỏng vấn. Vui lòng thử lại.");
    }
  };

  const isSaving = updateCandidateMutation.isPending || updateStageMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-2xl md:max-w-3xl rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Lên lịch phỏng vấn ứng viên
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết lập thời gian, hình thức và người đánh giá cho buổi phỏng vấn. Dữ liệu sẽ đồng bộ tự động trên toàn hệ thống.
              </p>
            </div>
          </div>
        </DialogHeader>

        {formError && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveInterview} className="space-y-5 pt-4">
          {/* Section 1: Job & Candidate Selection */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Vị trí tuyển dụng & Ứng viên</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Job Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vị trí tuyển dụng
                </label>
                <select
                  value={modalJobId}
                  onChange={(e) => {
                    const newJobId = e.target.value;
                    setModalJobId(newJobId);
                    const firstApp = applications.find((a) => String(a.jobId) === newJobId);
                    if (firstApp) {
                      handleCandidateChange(firstApp.id);
                    } else {
                      setModalCandidateId("");
                    }
                  }}
                  disabled={Boolean(selectedJobId && selectedApplicationId)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                >
                  {jobs.length === 0 ? (
                    <option value="">(Không có vị trí)</option>
                  ) : (
                    jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.department})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Candidate Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Ứng viên <span className="text-rose-500">*</span></span>
                  {currentCandidate && (
                    <span className="text-[10px] font-normal text-slate-400">
                      Giai đoạn: <strong className="font-semibold text-blue-600 dark:text-blue-400">{currentCandidate.stage}</strong>
                    </span>
                  )}
                </label>
                <select
                  value={modalCandidateId}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  disabled={Boolean(selectedApplicationId)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  required
                >
                  {modalCandidates.length === 0 ? (
                    <option value="">(Chưa có ứng viên nào cho vị trí này)</option>
                  ) : (
                    modalCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCandidateDisplayName(c)} — {c.candidateEmail}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Date, Time & Round Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interview Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Ngày phỏng vấn <span className="text-rose-500">*</span></span>
              </label>
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            {/* Interview Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Giờ hẹn <span className="text-rose-500">*</span></span>
              </label>
              <Input
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                required
              />
            </div>
          </div>

          {/* Section 3: Round & Format Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Round Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>Vòng phỏng vấn</span>
              </label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Sơ bộ (HR Screening)">HR Sơ loại (HR Screening)</option>
                <option value="Kỹ thuật (Technical)">Vòng Kỹ thuật (Technical Interview)</option>
                <option value="Văn hóa (Culture fit)">Văn hóa doanh nghiệp (Culture Fit)</option>
                <option value="Vòng cuối (Final round)">Vòng phỏng vấn Lãnh đạo (Final Round)</option>
                <option value="Đánh giá năng lực (Assessment)">Bài kiểm tra năng lực (Assessment / Live Coding)</option>
              </select>
            </div>

            {/* Meeting Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                {interviewFormat === "OFFICE" ? (
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <Video className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span>Hình thức tổ chức</span>
              </label>
              <select
                value={interviewFormat}
                onChange={(e) => {
                  const val = e.target.value as "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
                  setInterviewFormat(val);
                  if (val === "MEET" && !linkOrLocation.includes("zoom") && !linkOrLocation.includes("teams")) {
                    setLinkOrLocation("https://meet.google.com/");
                  } else if (val === "OFFICE" && linkOrLocation.startsWith("http")) {
                    setLinkOrLocation("");
                  }
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="MEET">Google Meet</option>
                <option value="ZOOM">Zoom Meeting</option>
                <option value="TEAMS">Microsoft Teams</option>
                <option value="OFFICE">Trực tiếp tại văn phòng công ty</option>
              </select>
            </div>
          </div>

          {/* Section 4: Meeting Link or Office Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {interviewFormat === "OFFICE"
                  ? "Địa chỉ văn phòng / Phòng họp trực tiếp"
                  : "Đường dẫn phòng họp trực tuyến (Meeting URL)"}
              </span>
            </label>
            <Input
              type="text"
              placeholder={
                interviewFormat === "OFFICE"
                  ? "VD: Tầng 8, Tòa nhà ABC, 123 Đường XYZ, Quận 1, TP.HCM"
                  : "https://meet.google.com/xyz-abcd-efg"
              }
              value={linkOrLocation}
              onChange={(e) => setLinkOrLocation(e.target.value)}
              className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Section 5: Interviewer & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Người phỏng vấn chính</span>
              </label>
              <Input
                type="text"
                placeholder="VD: Nguyễn Văn A (Engineering Lead)"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Ghi chú / Yêu cầu cho ứng viên (Tùy chọn)</span>
              </label>
              <Input
                type="text"
                placeholder="VD: Mang theo laptop hoặc chuẩn bị portfolio..."
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-all"
            >
              {isSaving ? "Đang lưu lịch..." : "Xác nhận lên lịch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
