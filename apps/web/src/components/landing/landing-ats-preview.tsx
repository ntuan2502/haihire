"use client";

import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, Menu, User } from "lucide-react";
import { matchesPersonNameSearch } from "@haihire/shared";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import { PipelineStageSelector } from "@/components/jobs/pipeline/pipeline-stage-selector";
import { PipelineCandidateCard } from "@/components/jobs/pipeline/pipeline-candidate-card";
import { PipelineCandidateDetail } from "@/components/jobs/pipeline/pipeline-candidate-detail";
import type {
  Application,
  ApplicationStage,
  CandidateDocument,
  Interview,
  Job,
} from "@/types";
import { usePipelineStages, useStageInfo } from "@/lib/stages";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";
import {
  DEFAULT_MOCK_JOB,
  DEFAULT_MOCK_APPLICATIONS,
  DEFAULT_MOCK_INTERVIEWS_BY_CANDIDATE,
} from "./ats-preview/ats-preview-data";

export const LandingAtsPreview: React.FC = () => {
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();

  // Active Stage Filter
  const [selectedStage, setSelectedStage] =
    useState<ApplicationStage>("SCREENING");

  // Selected Candidate ID
  const [selectedAppId, setSelectedAppId] = useState<string>("app-1");

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest" | "name">(
    "score",
  );

  // Detail view states
  const [candidateTab, setCandidateTab] = useState<string>("overview");
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Notes state
  const [candidateNotesList, setCandidateNotesList] = useState<string[]>([
    "Kinh nghiệm 4 năm vững chắc về React, TypeScript và thiết kế kiến trúc hệ thống.",
    "Đã vượt qua bài kiểm tra kỹ thuật thuật toán đạt 95/100 điểm.",
  ]);
  const [candidateNoteInput, setCandidateNoteInput] = useState("");

  // Mock Job object conforming strictly to Job interface
  const mockJob: Job = useMemo(() => DEFAULT_MOCK_JOB, []);

  // Mock Applications list conforming strictly to Application interface
  const [applications, setApplications] = useState<Application[]>(
    DEFAULT_MOCK_APPLICATIONS,
  );

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
        return matchesPersonNameSearch(
          {
            candidateName: app.candidateName,
            email: app.candidateEmail,
          },
          searchQuery,
        );
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          return (b.matchScore || 0) - (a.matchScore || 0);
        }
        if (sortBy === "newest") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        if (sortBy === "oldest") {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
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

  const currentStageConfig = useStageInfo(
    selectedCandidate?.stage || selectedStage,
  );

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
    const remaining = applications.filter(
      (app) => app.id !== selectedCandidate.id,
    );
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

  const mockInterviewsByCandidate: Record<string, Interview[]> =
    DEFAULT_MOCK_INTERVIEWS_BY_CANDIDATE;

  const candidateInterviews: Interview[] = useMemo(() => {
    if (!selectedCandidate) return [];
    return (
      mockInterviewsByCandidate[selectedCandidate.id] || [
        {
          id: `int-${selectedCandidate.id}`,
          applicationId: selectedCandidate.id,
          scheduledAt: "2026-09-28T03:30:00.000Z",
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
    <section
      id="demo"
      className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20"
    >
      {/* Main macOS Application Frame */}
      <div className="relative rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden transition-colors">
        {/* 1. macOS Window Titlebar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/80 px-3 sm:px-6 py-2 select-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500/80 ring-1 ring-rose-400/30" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/80 ring-1 ring-amber-400/30" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/80 ring-1 ring-emerald-400/30" />
          </div>

          <div className="text-xs font-medium text-muted-foreground truncate max-w-[160px] sm:max-w-none px-2">
            {t("landing.mockupAtsWindowTitle", { brand: "HaiHire" })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{t("landing.mockupActiveCandidates")}</span>
          </div>
        </div>

        {/* 2. Top Internal Application Bar */}
        <div className="border-b border-border bg-card px-3 sm:px-6 py-2 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <BrandLogo size="sm" />

            <div className="hidden sm:flex items-center gap-1 text-xs font-medium">
              <span className="px-3 py-1.5 rounded-md text-muted-foreground">
                {t("nav.dashboard")}
              </span>
              <span className="px-3 py-1.5 rounded-md bg-secondary text-foreground font-medium">
                {t("nav.jobs")}
              </span>
              <span className="px-3 py-1.5 rounded-md text-muted-foreground">
                {t("nav.candidates")}
              </span>
              <span className="px-3 py-1.5 rounded-md text-muted-foreground">
                {t("nav.applications")}
              </span>
              <span className="px-3 py-1.5 rounded-md text-muted-foreground">
                {t("nav.interviews")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center">
              AT
            </div>
          </div>
        </div>

        {/* 3. Job Breadcrumb */}
        <div className="border-b border-border bg-muted/40 px-3 sm:px-6 py-2 flex items-center justify-between text-xs overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-muted-foreground font-medium shrink-0">
              {t("nav.jobs")}
            </span>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="font-medium text-foreground truncate">
              {mockJob.title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md ml-1 shrink-0">
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
            } shrink-0 flex flex-col h-full border-r border-border bg-card overflow-hidden transition-colors duration-200 ${
              mobileDetailOpen ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search box & Toolbar */}
            <div className="shrink-0 p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("candidates.searchCandidates")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs bg-background border-input rounded-md"
                />
              </div>

              {/* Sort toolbar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) =>
                    setSortBy(val as "score" | "newest" | "oldest" | "name")
                  }
                  size="sm"
                  icon={ArrowUpDown}
                  options={[
                    { value: "score", label: t("applications.columns.score") },
                    { value: "newest", label: t("candidates.columns.added") },
                    { value: "oldest", label: t("common.created") },
                    { value: "name", label: t("candidates.candidateName") },
                  ]}
                  className="w-auto"
                  triggerClassName="h-7 text-xs py-1 px-2.5 font-medium"
                />

                <button
                  type="button"
                  disabled
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground opacity-40 cursor-not-allowed"
                >
                  <Menu className="h-3 w-3" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground font-mono tabular-nums pt-0.5">
                {candidateCountText}
              </p>
            </div>

            {/* Candidates List Container with ACTUAL PipelineCandidateCard */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border scrollbar-thin">
              {filteredCandidates.length === 0 ? (
                <div className="pt-8 pb-6 px-4 flex flex-col items-center text-center space-y-2 text-muted-foreground">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-medium text-foreground">
                      {t("candidates.noCandidatesYet")}
                    </h4>
                    <p className="text-xs text-muted-foreground">
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
