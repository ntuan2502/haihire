"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useJobs,
  useAllApplications,
  useUpdateCandidateMutation,
  useUpdateStageMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Users,
  Briefcase,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { getInitials, getCandidateDisplayName, parseCandidateNotes } from "@/lib/utils";
import type { Application, Job } from "@/types";

interface ScheduledInterviewInfo {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string; // Technical / Cultural / Screening / Final
  format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation: string;
  interviewer: string;
  notes?: string;
}

function parseInterviewFromNotes(notes?: string | null): ScheduledInterviewInfo | null {
  if (!notes) return null;
  const match = notes.match(/Interview:\s*(\{.*?\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as ScheduledInterviewInfo;
  } catch {
    return null;
  }
}

function stringifyInterviewToNotes(currentNotes: string | null | undefined, info: ScheduledInterviewInfo): string {
  const cleaned = (currentNotes || "").replace(/Interview:\s*\{.*?\}\s*\|?/g, "").trim();
  const jsonStr = JSON.stringify(info);
  return cleaned ? `${cleaned} | Interview: ${jsonStr}` : `Interview: ${jsonStr}`;
}

function InterviewsPageContent() {
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(user?.organizationId);
  const { data: applications = [], isLoading: appsLoading } = useAllApplications(user?.organizationId);

  const updateCandidateMutation = useUpdateCandidateMutation();
  const updateStageMutation = useUpdateStageMutation();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "AWAITING">("ALL");

  // Schedule Modal Form States
  const [modalJobId, setModalJobId] = useState<string>("");
  const [modalCandidateId, setModalCandidateId] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState<string>("");
  const [interviewTime, setInterviewTime] = useState<string>("10:00");
  const [interviewType, setInterviewType] = useState<string>("Kỹ thuật (Technical)");
  const [interviewFormat, setInterviewFormat] = useState<"MEET" | "ZOOM" | "TEAMS" | "OFFICE">("MEET");
  const [linkOrLocation, setLinkOrLocation] = useState<string>("https://meet.google.com/");
  const [interviewerName, setInterviewerName] = useState<string>(user?.name || "Hiring Team");
  const [interviewNotes, setInterviewNotes] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Candidates currently in INTERVIEW stage or having a scheduled interview
  const interviewApplications = useMemo(() => {
    return applications.filter((app) => {
      const hasScheduled = parseInterviewFromNotes(app.notes) !== null;
      return app.stage === "INTERVIEW" || hasScheduled;
    });
  }, [applications]);

  // Candidates for the Schedule Modal
  const modalCandidates = useMemo(() => {
    if (!modalJobId) return applications;
    return applications.filter((app) => String(app.jobId) === String(modalJobId));
  }, [applications, modalJobId]);

  // Open Schedule Modal prefilled
  const handleOpenScheduleModal = (prefilledApp?: Application) => {
    setFormError(null);
    if (prefilledApp) {
      setModalJobId(prefilledApp.jobId || (jobs[0]?.id ?? ""));
      setModalCandidateId(prefilledApp.id);
      const existing = parseInterviewFromNotes(prefilledApp.notes);
      if (existing) {
        setInterviewDate(existing.date);
        setInterviewTime(existing.time);
        setInterviewType(existing.type);
        setInterviewFormat(existing.format);
        setLinkOrLocation(existing.linkOrLocation);
        setInterviewerName(existing.interviewer);
        setInterviewNotes(existing.notes || "");
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setInterviewDate(tomorrow.toISOString().split("T")[0]);
        setInterviewTime("10:00");
        setLinkOrLocation("https://meet.google.com/");
        setInterviewerName(user?.name || "Hiring Team");
      }
    } else {
      setModalJobId(jobs[0]?.id || "");
      setModalCandidateId(applications[0]?.id || "");
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
    setScheduleModalOpen(true);
  };

  // Submit interview scheduling
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
    if (!candidate) return;

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

      // 2. If not already in INTERVIEW stage, advance to INTERVIEW stage
      if (candidate.stage !== "INTERVIEW") {
        await updateStageMutation.mutateAsync({
          id: candidate.id,
          stage: "INTERVIEW",
          orderIndex: 0,
        });
      }

      setScheduleModalOpen(false);
    } catch (err) {
      console.error("Schedule interview failed:", err);
      setFormError("Có lỗi xảy ra khi lưu lịch phỏng vấn. Vui lòng thử lại.");
    }
  };

  // Filtered interview list
  const filteredList = useMemo(() => {
    return interviewApplications.filter((app) => {
      // Job filter
      if (selectedJobFilter !== "ALL" && String(app.jobId) !== String(selectedJobFilter)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = app.candidateName.toLowerCase().includes(q);
        const emailMatch = app.candidateEmail.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      // Tab filter
      const scheduled = parseInterviewFromNotes(app.notes);
      if (activeTab === "UPCOMING") {
        return scheduled !== null;
      }
      if (activeTab === "AWAITING") {
        return scheduled === null && app.stage === "INTERVIEW";
      }

      return true;
    });
  }, [interviewApplications, selectedJobFilter, searchQuery, activeTab]);

  // KPIs
  const scheduledCount = interviewApplications.filter((a) => parseInterviewFromNotes(a.notes) !== null).length;
  const awaitingCount = interviewApplications.filter((a) => a.stage === "INTERVIEW" && parseInterviewFromNotes(a.notes) === null).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="interviews"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Không gian Phỏng vấn
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                {interviewApplications.length} ứng viên
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý lịch hẹn phỏng vấn, liên kết phòng họp trực tuyến và đánh giá ứng viên.
            </p>
          </div>

          {canEdit && (
            <Button
              onClick={() => handleOpenScheduleModal()}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Lên lịch phỏng vấn mới</span>
            </Button>
          )}
        </div>

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Đã lên lịch hẹn</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{scheduledCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Chờ xếp ngày giờ</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{awaitingCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Tổng ứng viên vòng phỏng vấn</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{interviewApplications.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Tabs */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 self-start">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tất cả ({interviewApplications.length})
            </button>
            <button
              onClick={() => setActiveTab("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "UPCOMING"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Đã có lịch ({scheduledCount})
            </button>
            <button
              onClick={() => setActiveTab("AWAITING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "AWAITING"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Chờ xếp lịch ({awaitingCount})
            </button>
          </div>

          {/* Search & Job Filter */}
          <div className="flex items-center gap-2.5 flex-1 md:max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs rounded-xl"
              />
            </div>

            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              aria-label="Lọc theo vị trí công việc"
              className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả vị trí</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {appsLoading || jobsLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner text="Đang tải danh sách lịch phỏng vấn..." />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Không tìm thấy buổi phỏng vấn nào phù hợp
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Chưa có lịch hẹn nào được ghi nhận cho bộ lọc này. Bạn có thể chọn ứng viên từ bảng Pipeline hoặc bấm Lên lịch phỏng vấn mới.
            </p>
            {canEdit && (
              <Button
                onClick={() => handleOpenScheduleModal()}
                variant="outline"
                className="h-8 px-3 rounded-xl text-xs font-bold cursor-pointer"
              >
                + Lên lịch phỏng vấn ngay
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((app) => {
              const scheduled = parseInterviewFromNotes(app.notes);
              const displayName = getCandidateDisplayName(app);
              const initials = getInitials(displayName);
              const job = jobs.find((j) => String(j.id) === String(app.jobId));

              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-4 flex flex-col justify-between"
                >
                  {/* Top: Candidate & Job title */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">{app.candidateEmail}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        scheduled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60"
                          : "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                      }`}
                    >
                      {scheduled ? "Đã lên lịch" : "Chờ xếp lịch"}
                    </span>
                  </div>

                  {/* Position Tag */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                      <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold truncate">{job?.title || "Vị trí tuyển dụng"}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{job?.department || "HR"}</span>
                  </div>

                  {/* Scheduled Details Card */}
                  {scheduled ? (
                    <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <Calendar className="h-3.5 w-3.5 text-blue-600" />
                          <span>{scheduled.date} ({scheduled.time})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                          {scheduled.type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Người phỏng vấn: <strong className="text-slate-700 dark:text-slate-300">{scheduled.interviewer}</strong></span>
                        <span className="flex items-center gap-1">
                          {scheduled.format === "OFFICE" ? (
                            <>
                              <MapPin className="h-3 w-3 text-rose-500" />
                              <span>Tại văn phòng</span>
                            </>
                          ) : (
                            <>
                              <Video className="h-3 w-3 text-emerald-500" />
                              <span>{scheduled.format}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {scheduled.linkOrLocation && (
                        <div className="pt-1">
                          {scheduled.linkOrLocation.startsWith("http") ? (
                            <a
                              href={scheduled.linkOrLocation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Vào phòng họp trực tuyến</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Địa điểm: {scheduled.linkOrLocation}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Chưa có lịch hẹn cụ thể
                      </p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Ứng viên đã vượt qua vòng sơ loại và sẵn sàng cho buổi phỏng vấn.
                      </p>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (job) {
                          router.push(`/dashboard/jobs/${job.id}/pipeline?stage=INTERVIEW`);
                        }
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Xem bảng đánh giá</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>

                    {canEdit && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenScheduleModal(app)}
                        variant="outline"
                        className="h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {scheduled ? "Cập nhật lịch" : "Lên lịch ngay"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Schedule Interview Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Lên lịch phỏng vấn ứng viên</span>
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveInterview} className="space-y-3.5 py-2">
            {/* Choose Job */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Vị trí tuyển dụng
              </label>
              <select
                value={modalJobId}
                onChange={(e) => {
                  setModalJobId(e.target.value);
                  const firstApp = applications.find((a) => String(a.jobId) === e.target.value);
                  setModalCandidateId(firstApp?.id || "");
                }}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Choose Candidate */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ứng viên <span className="text-rose-500">*</span>
              </label>
              <select
                value={modalCandidateId}
                onChange={(e) => setModalCandidateId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                required
              >
                {modalCandidates.length === 0 ? (
                  <option value="">(Chưa có ứng viên nào cho vị trí này)</option>
                ) : (
                  modalCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCandidateDisplayName(c)} - {c.candidateEmail}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ngày phỏng vấn <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Giờ hẹn
                </label>
                <Input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            {/* Type & Format Row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vòng phỏng vấn
                </label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                >
                  <option value="Kỹ thuật (Technical)">Vòng Kỹ thuật</option>
                  <option value="Văn hóa (Culture fit)">Văn hóa doanh nghiệp</option>
                  <option value="Sơ bộ (HR Screening)">HR Sơ loại</option>
                  <option value="Vòng cuối (Final round)">Vòng phỏng vấn Lãnh đạo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hình thức
                </label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as "MEET" | "ZOOM" | "TEAMS" | "OFFICE")}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                >
                  <option value="MEET">Google Meet</option>
                  <option value="ZOOM">Zoom Meeting</option>
                  <option value="TEAMS">Microsoft Teams</option>
                  <option value="OFFICE">Trực tiếp tại văn phòng</option>
                </select>
              </div>
            </div>

            {/* Link or Location */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {interviewFormat === "OFFICE" ? "Địa chỉ văn phòng" : "Link phòng họp trực tuyến"}
              </label>
              <Input
                type="text"
                placeholder={interviewFormat === "OFFICE" ? "Tầng 5, Tòa nhà ABC, Hà Nội" : "https://meet.google.com/xyz-abcd-efg"}
                value={linkOrLocation}
                onChange={(e) => setLinkOrLocation(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Interviewer Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Người phỏng vấn phụ trách
              </label>
              <Input
                type="text"
                placeholder="VD: Nguyễn Văn B (Lead Engineer)"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleModalOpen(false)}
                className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={updateCandidateMutation.isPending || updateStageMutation.isPending}
                className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {updateCandidateMutation.isPending ? "Đang lưu..." : "Xác nhận lên lịch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <AuthGuard>
      <InterviewsPageContent />
    </AuthGuard>
  );
}
