"use client";

import React, { useState, useMemo, useRef } from "react";
import { Search, ArrowUpDown, Menu, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import { PipelineStageSelector } from "@/components/jobs/pipeline/pipeline-stage-selector";
import { PipelineCandidateCard } from "@/components/jobs/pipeline/pipeline-candidate-card";
import { PipelineCandidateDetail } from "@/components/jobs/pipeline/pipeline-candidate-detail";
import {
  type OverviewSectionsState,
  DEFAULT_OVERVIEW_SECTIONS,
} from "@/components/applications/overview-sections-popover";
import type { Application, ApplicationStage, CandidateDocument, Interview, Job } from "@/types";
import { usePipelineStages, useStageInfo } from "@/lib/stages";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";

export const LandingAtsPreview: React.FC = () => {
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();

  // Active Stage Filter
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>("SCREENING");

  // Selected Candidate ID
  const [selectedAppId, setSelectedAppId] = useState<string>("app-1");

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">("score");

  // Detail view states
  const [candidateTab, setCandidateTab] = useState<string>("overview");
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Overview popover state
  const [overviewSections, setOverviewSections] =
    useState<OverviewSectionsState>(DEFAULT_OVERVIEW_SECTIONS);
  const [isOverviewPopoverOpen, setIsOverviewPopoverOpen] = useState(false);
  const overviewBtnRef = useRef<HTMLButtonElement>(null);

  // Notes state
  const [candidateNotesList, setCandidateNotesList] = useState<string[]>([
    "Kinh nghiệm 4 năm vững chắc về React, TypeScript và thiết kế kiến trúc hệ thống.",
    "Đã vượt qua bài kiểm tra kỹ thuật thuật toán đạt 95/100 điểm.",
  ]);
  const [candidateNoteInput, setCandidateNoteInput] = useState("");

  // Mock Job object conforming strictly to Job interface
  const mockJob: Job = useMemo(
    () => ({
      id: "job-demo-1",
      title: "Senior Full-Stack Engineer",
      department: "Engineering",
      location: "Hanoi / Remote",
      type: "FULL_TIME",
      experienceLevel: "SENIOR_LEVEL",
      workplace: "HYBRID",
      status: "PUBLISHED",
      description: "Phát triển và mở rộng hệ thống tuyển dụng thông minh HaiHire ATS.",
      requirements: "Ít nhất 4 năm kinh nghiệm với React, Node.js, TypeScript, PostgreSQL.",
      salaryRange: "2,500 - 3,500 USD",
      isPublished: true,
      createdAt: "2026-09-01T08:00:00Z",
      updatedAt: "2026-09-24T10:00:00Z",
    }),
    [],
  );

  // Mock Applications list conforming strictly to Application interface
  const [applications, setApplications] = useState<Application[]>([
    {
      id: "app-1",
      candidateId: "cand-1",
      jobId: "job-demo-1",
      candidateName: "Trần Minh Quân",
      candidateEmail: "quan.tran@example.com",
      candidatePhone: "+84 912 345 678",
      stage: "SCREENING",
      matchScore: 95,
      orderIndex: 0,
      resumeUrl: "/demo-resume.pdf",
      resumeFileName: "CV_Tran_Minh_Quan_Senior_FullStack.pdf",
      notes: "Kinh nghiệm 4 năm React 19, TypeScript và PostgreSQL.",
      createdAt: "2026-09-24T08:30:00Z",
      updatedAt: "2026-09-24T09:00:00Z",
    },
    {
      id: "app-2",
      candidateId: "cand-2",
      jobId: "job-demo-1",
      candidateName: "Nguyễn Hoàng Nam",
      candidateEmail: "nam.nguyen@example.com",
      candidatePhone: "+84 903 112 233",
      stage: "APPLIED",
      matchScore: 88,
      orderIndex: 1,
      resumeUrl: "/demo-resume.pdf",
      resumeFileName: "CV_Nguyen_Hoang_Nam_Frontend_Lead.pdf",
      notes: "Frontend Lead 5 năm kinh nghiệm, React & TailwindCSS.",
      createdAt: "2026-09-24T07:15:00Z",
      updatedAt: "2026-09-24T07:15:00Z",
    },
    {
      id: "app-3",
      candidateId: "cand-3",
      jobId: "job-demo-1",
      candidateName: "Lê Thị Thu Thảo",
      candidateEmail: "thao.le@example.com",
      candidatePhone: "+84 988 776 655",
      stage: "INTERVIEW",
      matchScore: 84,
      orderIndex: 2,
      resumeUrl: "/demo-resume.pdf",
      resumeFileName: "CV_Le_Thi_Thu_Thao_FullStack.pdf",
      notes: "Đã hoàn thành vòng phỏng vấn 1, chuẩn bị vòng System Design.",
      createdAt: "2026-09-23T14:20:00Z",
      updatedAt: "2026-09-24T10:00:00Z",
    },
    {
      id: "app-4",
      candidateId: "cand-4",
      jobId: "job-demo-1",
      candidateName: "Phạm Đức Anh",
      candidateEmail: "anh.pham@example.com",
      candidatePhone: "+84 977 443 322",
      stage: "OFFER",
      matchScore: 92,
      orderIndex: 3,
      resumeUrl: "/demo-resume.pdf",
      resumeFileName: "CV_Pham_Duc_Anh_Backend.pdf",
      notes: "Hội đồng tuyển dụng đã duyệt mức Offer chính thức.",
      createdAt: "2026-09-22T09:00:00Z",
      updatedAt: "2026-09-24T11:00:00Z",
    },
    {
      id: "app-5",
      candidateId: "cand-5",
      jobId: "job-demo-1",
      candidateName: "Vũ Minh Tuấn",
      candidateEmail: "tuan.vu@example.com",
      candidatePhone: "+84 966 221 144",
      stage: "HIRED",
      matchScore: 96,
      orderIndex: 4,
      resumeUrl: "/demo-resume.pdf",
      resumeFileName: "CV_Vu_Minh_Tuan_Staff_Engineer.pdf",
      notes: "Ứng viên đã ký Offer, lịch onboarding bắt đầu tuần tới.",
      createdAt: "2026-09-20T10:00:00Z",
      updatedAt: "2026-09-25T16:00:00Z",
    },
    {
      id: "app-6",
      candidateId: "cand-6",
      jobId: "job-demo-1",
      candidateName: "Đặng Quốc Huy",
      candidateEmail: "huy.dang@example.com",
      candidatePhone: "+84 933 554 411",
      stage: "REJECTED",
      matchScore: 62,
      orderIndex: 5,
      resumeUrl: "/demo-resume.pdf",
      resumeFileName: "CV_Dang_Quoc_Huy.pdf",
      notes: "Chưa đủ kinh nghiệm thực tế với TypeScript và Microservices.",
      createdAt: "2026-09-21T11:00:00Z",
      updatedAt: "2026-09-23T15:00:00Z",
    },
  ]);

  // Stage counts derived dynamically from live state
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0,
    };
    applications.forEach((app) => {
      if (counts[app.stage] !== undefined) {
        counts[app.stage]++;
      }
    });
    return counts;
  }, [applications]);

  // Filtered & sorted candidates list for left sidebar
  const filteredCandidates = useMemo(() => {
    return applications
      .filter((app) => app.stage === selectedStage)
      .filter((app) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          return (b.matchScore || 0) - (a.matchScore || 0);
        }
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "name") {
          return a.candidateName.localeCompare(b.candidateName);
        }
        return 0;
      });
  }, [applications, selectedStage, searchQuery, sortBy]);

  // Selected candidate object
  const selectedCandidate = useMemo(() => {
    return (
      filteredCandidates.find((c) => c.id === selectedAppId) ||
      applications.find((c) => c.id === selectedAppId) ||
      filteredCandidates[0] ||
      applications[0]
    );
  }, [filteredCandidates, applications, selectedAppId]);

  const currentStageConfig = useStageInfo(selectedCandidate?.stage || selectedStage);

  const currentIndex = useMemo(() => {
    if (!selectedCandidate) return -1;
    return filteredCandidates.findIndex((c) => c.id === selectedCandidate.id);
  }, [filteredCandidates, selectedCandidate]);

  // Candidate navigation handlers
  const handlePrevCandidate = () => {
    if (currentIndex > 0) {
      setSelectedAppId(filteredCandidates[currentIndex - 1].id);
    }
  };

  const handleNextCandidate = () => {
    if (currentIndex >= 0 && currentIndex < filteredCandidates.length - 1) {
      setSelectedAppId(filteredCandidates[currentIndex + 1].id);
    }
  };

  // Real stage transition handler: modifies state dynamically!
  const handleMoveCandidateStage = (newStage: ApplicationStage) => {
    if (!selectedCandidate) return;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === selectedCandidate.id ? { ...app, stage: newStage } : app,
      ),
    );
    setSelectedStage(newStage);
  };

  const handleDeleteCandidate = () => {
    if (!selectedCandidate) return;
    const remaining = applications.filter((app) => app.id !== selectedCandidate.id);
    setApplications(remaining);
    const nextCandidate =
      remaining.find((app) => app.stage === selectedStage) || remaining[0];
    if (nextCandidate) {
      setSelectedAppId(nextCandidate.id);
    }
  };

  // Notes handling
  const handleAddNote = () => {
    if (!candidateNoteInput.trim()) return;
    setCandidateNotesList((prev) => [candidateNoteInput.trim(), ...prev]);
    setCandidateNoteInput("");
  };

  // Documents & Interviews for candidate detail
  const candidateDocuments: CandidateDocument[] = useMemo(() => {
    if (!selectedCandidate) return [];
    return [
      {
        id: "doc-preview-1",
        name: selectedCandidate.resumeFileName || "CV_Resume.pdf",
        url: selectedCandidate.resumeUrl || "/demo-resume.pdf",
        type: "RESUME",
        size: 2450000,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [selectedCandidate]);

  const mockInterviewsByCandidate: Record<string, Interview[]> = useMemo(
    () => ({
      "app-1": [
        {
          id: "int-1-1",
          applicationId: "app-1",
          date: "2026-09-28",
          time: "10:30",
          type: "TECHNICAL",
          format: "MEET",
          linkOrLocation: "https://meet.google.com/haihire-tech-interview",
          interviewer: "Nguyễn Văn Trưởng (Engineering Lead)",
          round: 1,
          notes: "Phỏng vấn kỹ thuật trực tuyến về React 19, TypeScript và tối ưu hóa hệ thống.",
          createdAt: "2026-09-24T08:00:00Z",
          updatedAt: "2026-09-24T08:00:00Z",
        },
      ],
      "app-2": [
        {
          id: "int-2-1",
          applicationId: "app-2",
          date: "2026-09-29",
          time: "09:00",
          type: "HR_SCREENING",
          format: "MEET",
          linkOrLocation: "https://meet.google.com/haihire-hr-screening",
          interviewer: "Đỗ Mai Linh (Talent Acquisition Specialist)",
          round: 1,
          notes: "Trao đổi sơ bộ về kỳ vọng công việc và văn hóa công ty.",
          createdAt: "2026-09-24T07:15:00Z",
          updatedAt: "2026-09-24T07:15:00Z",
        },
      ],
      "app-3": [
        {
          id: "int-3-1",
          applicationId: "app-3",
          date: "2026-09-27",
          time: "14:00",
          type: "FINAL_ROUND",
          format: "MEET",
          linkOrLocation: "https://meet.google.com/haihire-final-round",
          interviewer: "Hoàng Minh Tuấn (CTO)",
          round: 2,
          notes: "Vòng phỏng vấn chuyên sâu System Design và định hướng sản phẩm.",
          createdAt: "2026-09-23T14:20:00Z",
          updatedAt: "2026-09-24T10:00:00Z",
        },
        {
          id: "int-3-2",
          applicationId: "app-3",
          date: "2026-09-25",
          time: "09:30",
          type: "TECHNICAL",
          format: "MEET",
          linkOrLocation: "https://meet.google.com/haihire-tech-interview",
          interviewer: "Phan Đình Nam (Senior Architect)",
          round: 1,
          scorecard: {
            overallRating: 4,
            recommendation: "STRONG_YES",
            technicalScore: 5,
            communicationScore: 4,
            cultureScore: 4,
            problemSolvingScore: 5,
            feedback: "Nền tảng kỹ thuật rất tốt, giải quyết bài toán concurrency xuất sắc.",
            evaluatedBy: "Phan Đình Nam",
            evaluatedAt: "2026-09-25T10:45:00Z",
          },
          notes: "Đã hoàn thành vòng 1 xuất sắc.",
          createdAt: "2026-09-22T08:00:00Z",
          updatedAt: "2026-09-25T11:00:00Z",
        },
      ],
      "app-4": [
        {
          id: "int-4-1",
          applicationId: "app-4",
          date: "2026-09-22",
          time: "15:00",
          type: "FINAL_ROUND",
          format: "OFFICE",
          linkOrLocation: "Phòng họp Sapphire, Tầng 12 Tòa nhà HaiHire, Hà Nội",
          interviewer: "Đỗ Mai Linh (Head of HR) & Ban Giám Đốc",
          round: 2,
          scorecard: {
            overallRating: 5,
            recommendation: "STRONG_YES",
            technicalScore: 5,
            communicationScore: 5,
            cultureScore: 5,
            problemSolvingScore: 5,
            feedback: "Ứng viên rất phù hợp với vị trí Backend và định hướng của công ty.",
            evaluatedBy: "Đỗ Mai Linh",
            evaluatedAt: "2026-09-22T16:00:00Z",
          },
          notes: "Phỏng vấn trực tiếp tại văn phòng, thống nhất mức đãi ngộ và lộ trình công việc.",
          createdAt: "2026-09-20T09:00:00Z",
          updatedAt: "2026-09-22T16:00:00Z",
        },
      ],
      "app-5": [
        {
          id: "int-5-1",
          applicationId: "app-5",
          date: "2026-09-18",
          time: "10:00",
          type: "FINAL_ROUND",
          format: "OFFICE",
          linkOrLocation: "Phòng họp Diamond, Tầng 12 Tòa nhà HaiHire, Hà Nội",
          interviewer: "CEO & CTO",
          round: 2,
          scorecard: {
            overallRating: 5,
            recommendation: "STRONG_YES",
            technicalScore: 5,
            communicationScore: 5,
            cultureScore: 5,
            problemSolvingScore: 5,
            feedback: "Staff Engineer giàu kinh nghiệm thực chiến.",
            evaluatedBy: "CEO",
            evaluatedAt: "2026-09-18T11:30:00Z",
          },
          notes: "Đã chốt nhận việc và chuẩn bị onboarding.",
          createdAt: "2026-09-15T09:00:00Z",
          updatedAt: "2026-09-18T11:30:00Z",
        },
      ],
      "app-6": [
        {
          id: "int-6-1",
          applicationId: "app-6",
          date: "2026-09-22",
          time: "11:00",
          type: "HR_SCREENING",
          format: "MEET",
          linkOrLocation: "https://meet.google.com/haihire-hr-screening",
          interviewer: "Đỗ Mai Linh (Talent Acquisition Specialist)",
          round: 1,
          scorecard: {
            overallRating: 2,
            recommendation: "NO",
            technicalScore: 2,
            communicationScore: 3,
            cultureScore: 3,
            problemSolvingScore: 2,
            feedback: "Kỹ năng nền tảng chưa đáp ứng yêu cầu của vị trí hiện tại.",
            evaluatedBy: "Đỗ Mai Linh",
            evaluatedAt: "2026-09-22T11:45:00Z",
          },
          notes: "Đã gửi email phản hồi kết quả.",
          createdAt: "2026-09-21T11:00:00Z",
          updatedAt: "2026-09-23T15:00:00Z",
        },
      ],
    }),
    [],
  );

  const candidateInterviews: Interview[] = useMemo(() => {
    if (!selectedCandidate) return [];
    return (
      mockInterviewsByCandidate[selectedCandidate.id] || [
        {
          id: `int-${selectedCandidate.id}`,
          applicationId: selectedCandidate.id,
          date: "2026-09-28",
          time: "10:30",
          type: "TECHNICAL",
          format: "MEET",
          linkOrLocation: "https://meet.google.com/haihire-tech-interview",
          interviewer: "Nguyễn Văn Trưởng (Engineering Lead)",
          round: 1,
          notes: "Phỏng vấn kỹ thuật trực tuyến.",
          createdAt: "2026-09-24T08:00:00Z",
          updatedAt: "2026-09-24T08:00:00Z",
        },
      ]
    );
  }, [selectedCandidate, mockInterviewsByCandidate]);

  const candidateCountText =
    filteredCandidates.length === 0
      ? `${t("common.showing")} 0-0 ${t("common.of")} 0 ${t("nav.candidates").toLowerCase()}`
      : `${t("common.showing")} 1-${filteredCandidates.length} ${t("common.of")} ${filteredCandidates.length} ${t("nav.candidates").toLowerCase()}`;

  return (
    <section id="demo" className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20">
      {/* Background Atmosphere Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-blue-600/15 dark:bg-blue-600/20 blur-[120px] rounded-full" />

      {/* Main macOS Application Frame */}
      <div className="relative rounded-2xl border border-slate-200/90 dark:border-white/15 bg-white dark:bg-slate-950 shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10 transition-colors">
        {/* 1. macOS Window Titlebar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-slate-100/90 dark:bg-slate-900/90 px-3 sm:px-6 py-2 select-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500/80 ring-1 ring-rose-400/30" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/80 ring-1 ring-amber-400/30" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/80 ring-1 ring-emerald-400/30" />
          </div>

          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[160px] sm:max-w-none px-2">
            {t("landing.mockupAtsWindowTitle", { brand: "HaiHire" })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("landing.mockupActiveCandidates")}</span>
          </div>
        </div>

        {/* 2. Top Internal Application Bar */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <BrandLogo size="sm" />

            <div className="hidden sm:flex items-center gap-1 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
                {t("nav.dashboard")}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold">
                {t("nav.jobs")}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
                {t("nav.candidates")}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
                {t("nav.applications")}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400">
                {t("nav.interviews")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              AT
            </div>
          </div>
        </div>

        {/* 3. Job Breadcrumb */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 sm:px-6 py-2 flex items-center justify-between text-xs overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">{t("nav.jobs")}</span>
            <span className="text-slate-400 shrink-0">/</span>
            <span className="font-bold text-slate-900 dark:text-white truncate">{mockJob.title}</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full ml-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{mockJob.location}</span>
            </span>
          </div>
        </div>

        {/* 4. ACTUAL REUSED PipelineStageSelector Component */}
        <PipelineStageSelector
          stages={pipelineStages}
          stageCounts={stageCounts}
          selectedStage={selectedStage}
          onSelectStage={(stage) => {
            setSelectedStage(stage);
            const firstInStage = applications.find((a) => a.stage === stage);
            if (firstInStage) {
              setSelectedAppId(firstInStage.id);
            }
          }}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          isListCollapsed={isListCollapsed}
          onToggleCollapse={() => setIsListCollapsed((prev) => !prev)}
        />

        {/* 5. ACTUAL REUSED Master-Detail Workspace */}
        <div className="flex flex-col md:flex-row h-[580px] overflow-hidden">
          {/* LEFT COLUMN: Candidates List */}
          <aside
            className={`w-full ${
              isListCollapsed ? "md:w-0 md:hidden" : "md:w-80 lg:w-84"
            } shrink-0 flex flex-col h-full border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200 ${
              mobileDetailOpen ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search box & Toolbar */}
            <div className="shrink-0 p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t("candidates.searchCandidates")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              {/* Sort toolbar */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as "score" | "newest" | "oldest" | "name")}
                  size="sm"
                  icon={ArrowUpDown}
                  options={[
                    { value: "score", label: t("applications.columns.score") },
                    { value: "newest", label: t("candidates.columns.added") },
                    { value: "oldest", label: t("common.created") },
                    { value: "name", label: t("candidates.candidateName") },
                  ]}
                  className="w-auto"
                  triggerClassName="h-7 text-xs py-1 px-2.5 font-semibold"
                />

                <button
                  type="button"
                  disabled
                  className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 opacity-40 cursor-not-allowed"
                >
                  <Menu className="h-3 w-3" />
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                {candidateCountText}
              </p>
            </div>

            {/* Candidates List Container with ACTUAL PipelineCandidateCard */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
              {filteredCandidates.length === 0 ? (
                <div className="pt-8 pb-6 px-4 flex flex-col items-center text-center space-y-2 text-slate-400">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t("candidates.noCandidatesYet")}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {t("candidates.noApplicationsMatchingStage")}
                    </p>
                  </div>
                </div>
              ) : (
                filteredCandidates.map((candidate) => (
                  <PipelineCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={candidate.id === selectedCandidate?.id}
                    onSelect={() => {
                      setSelectedAppId(candidate.id);
                      setMobileDetailOpen(true);
                    }}
                  />
                ))
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN: ACTUAL REUSED PipelineCandidateDetail Component */}
          <PipelineCandidateDetail
            selectedCandidate={selectedCandidate || null}
            currentStageConfig={currentStageConfig}
            mobileDetailOpen={mobileDetailOpen}
            onCloseMobileDetail={() => setMobileDetailOpen(false)}
            job={mockJob}
            canEdit={true}
            isMovingStage={false}
            onMoveStage={handleMoveCandidateStage}
            currentIndex={currentIndex}
            totalCandidates={filteredCandidates.length}
            onPrevCandidate={handlePrevCandidate}
            onNextCandidate={handleNextCandidate}
            candidateTab={candidateTab}
            onSelectTab={setCandidateTab}
            overviewSections={overviewSections}
            onToggleOverviewSection={(key) =>
              setOverviewSections((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            isOverviewPopoverOpen={isOverviewPopoverOpen}
            onToggleOverviewPopover={() => setIsOverviewPopoverOpen((prev) => !prev)}
            onCloseOverviewPopover={() => setIsOverviewPopoverOpen(false)}
            overviewBtnRef={overviewBtnRef}
            candidateDocuments={candidateDocuments}
            onPreviewDoc={() => {}}
            onDownloadDoc={() => {}}
            candidateInterviews={candidateInterviews}
            onScheduleInterview={() => {}}
            candidateNotesList={candidateNotesList}
            candidateNoteInput={candidateNoteInput}
            onChangeNoteInput={setCandidateNoteInput}
            onAddNote={handleAddNote}
            isUpdatingNote={false}
            onDeleteApplication={handleDeleteCandidate}
          />
        </div>
      </div>
    </section>
  );
};
