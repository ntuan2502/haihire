"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useJobs,
  useAllApplications,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Search,
  Plus,
  ExternalLink,
  ChevronRight,
  Users,
  Briefcase,
} from "lucide-react";
import { getInitials, getCandidateDisplayName } from "@/lib/utils";
import { parseInterviewFromNotes } from "@/lib/interviews";
import type { Application } from "@/types";

function InterviewsPageContent() {
  const router = useRouter();
  const { user, canEdit } = useAuth();

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(user?.organizationId);
  const { data: applications = [], isLoading: appsLoading } = useAllApplications(user?.organizationId);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<Application | undefined>(undefined);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "AWAITING">("ALL");

  // Candidates currently in INTERVIEW stage or having a scheduled interview
  const interviewApplications = useMemo(() => {
    return applications.filter((app) => {
      const hasScheduled = parseInterviewFromNotes(app.notes) !== null;
      return app.stage === "INTERVIEW" || hasScheduled;
    });
  }, [applications]);

  // Open Schedule Modal prefilled
  const handleOpenScheduleModal = (prefilledApp?: Application) => {
    setSelectedAppForSchedule(prefilledApp);
    setScheduleModalOpen(true);
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
              <p className="text-xs font-semibold text-slate-400">Chờ xếp lịch phỏng vấn</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{awaitingCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Tổng ứng viên vòng phỏng vấn</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{interviewApplications.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filters & Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tất cả ({interviewApplications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "UPCOMING"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Đã có lịch ({scheduledCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("AWAITING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "AWAITING"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Cần lên lịch ({awaitingCount})
            </button>
          </div>

          {/* Search & Job Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm ứng viên, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
              />
            </div>

            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
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

        {/* List of Interview Candidates */}
        {jobsLoading || appsLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Chưa có ứng viên nào trong danh sách
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Khi bạn chuyển ứng viên sang giai đoạn &ldquo;Phỏng vấn&rdquo; hoặc lên lịch phỏng vấn, thông tin sẽ hiển thị tại đây.
            </p>
            {canEdit && (
              <Button
                onClick={() => handleOpenScheduleModal()}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Lên lịch phỏng vấn đầu tiên</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((app) => {
              const job = jobs.find((j) => String(j.id) === String(app.jobId));
              const scheduled = parseInterviewFromNotes(app.notes);
              const displayName = getCandidateDisplayName(app);
              const initials = getInitials(displayName);

              return (
                <div
                  key={app.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Candidate Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {displayName}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">{app.candidateEmail}</p>
                      </div>
                    </div>

                    {scheduled ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                        Đã có lịch
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-900/60 shrink-0">
                        Chờ lên lịch
                      </span>
                    )}
                  </div>

                  {/* Job Badge */}
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

      {/* Schedule Interview Reusable Modal */}
      <ScheduleInterviewModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedAppForSchedule(undefined);
        }}
        jobs={jobs}
        applications={applications}
        selectedJobId={selectedAppForSchedule?.jobId || undefined}
        selectedApplicationId={selectedAppForSchedule?.id || undefined}
      />

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
