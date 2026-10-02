"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SlideOver } from "@/components/shared/slide-over";
import {
  X,
  ExternalLink,
  Edit2,
  Calendar,
  Clock,
  MessageSquare,
  Plus,
  Briefcase,
  FileText,
  UploadCloud,
  Loader2,
  Eye,
  Download,
  Trash2,
  ArrowLeft,
  Mail,
  Phone,
} from "lucide-react";
import { CustomSelect } from "@/components/shared/custom-select";
import { StageBadge } from "@/components/shared/stage-badge";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { DeleteDocumentModal } from "@/components/candidates/delete-document-modal";
import {
  useCandidate,
  useUploadCandidateDocumentMutation,
  useDeleteCandidateDocumentMutation,
  useDeleteDocumentMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { getDocumentUrl, downloadAuthenticatedFile } from "@/lib/api";
import {
  formatDate,
  parseCandidateNotes,
  parseCandidateDocuments,
  fixUtf8String,
  getGenderLabel,
  type CandidateItem,
} from "@/lib/utils";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import type { CandidateDocument, Application, Job } from "@/types";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

interface CandidateDrawerProps {
  candidate: CandidateItem | null;
  onClose: () => void;
  jobs: Job[];
  canEdit: boolean;
  onApplyToJob: (candidate: CandidateItem) => void;
  onScheduleInterview: (
    app: Application,
    interview?: ScheduledInterviewInfo | null,
  ) => void;
}

export function CandidateDrawer({
  candidate,
  onClose,
  jobs,
  canEdit,
  onApplyToJob,
  onScheduleInterview,
}: CandidateDrawerProps) {
  const router = useRouter();
  const { t } = useI18n();

  // Fetch full details of the candidate
  const { data: fullCandidate } = useCandidate(candidate?.id || null);

  // Drawer Tabs State
  const [drawerTab, setDrawerTab] = useState<"applications" | "documents">("applications");
  const [drawerStageFilter, setDrawerStageFilter] = useState<string>("ALL");
  const [drawerDocFilter, setDrawerDocFilter] = useState<string>("All");
  const [drawerPreviewDoc, setDrawerPreviewDoc] = useState<CandidateDocument | null>(null);
  const [isUploadingDrawerDoc, setIsUploadingDrawerDoc] = useState(false);
  const [drawerDocToDelete, setDrawerDocToDelete] = useState<CandidateDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const drawerDocInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const uploadCandidateDocMutation = useUploadCandidateDocumentMutation();
  const deleteCandidateDocMutation = useDeleteCandidateDocumentMutation();
  const deleteAppDocMutation = useDeleteDocumentMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const selectedCandidateDetails = useMemo(() => {
    if (!candidate) return { gender: "—", dob: "—", firstName: "", lastName: "", displayName: "", customNotes: "" };
    const cand = fullCandidate || candidate.candidate;
    const notesParsed = parseCandidateNotes(cand?.notes, cand?.name || candidate.name);
    const genderLabel = getGenderLabel(cand?.gender, t);
    const dobFormatted = cand?.dateOfBirth ? formatDate(cand.dateOfBirth, "short") : "—";
    return {
      gender: genderLabel,
      dob: dobFormatted,
      firstName: cand?.firstName || "",
      lastName: cand?.lastName || "",
      displayName: cand?.name || candidate.name || "",
      customNotes: notesParsed.customNotes || cand?.notes || "",
    };
  }, [candidate, fullCandidate, t]);

  const selectedCandidateApps = useMemo(() => {
    if (!candidate) return [];
    return (
      fullCandidate?.applications ||
      candidate.candidate?.applications ||
      []
    );
  }, [candidate, fullCandidate]);

  const filteredDrawerApps = useMemo(() => {
    if (drawerStageFilter === "ALL") return selectedCandidateApps;
    return selectedCandidateApps.filter(
      (app: Application) => app.stage === drawerStageFilter,
    );
  }, [selectedCandidateApps, drawerStageFilter]);

  const drawerCandidateDocuments: CandidateDocument[] = useMemo(() => {
    if (!candidate) return [];
    if (fullCandidate?.allDocuments && fullCandidate.allDocuments.length > 0) {
      return fullCandidate.allDocuments;
    }
    const cand = fullCandidate || candidate.candidate;
    const docs = parseCandidateDocuments(cand?.notes);
    if (docs.length === 0 && cand?.resumeUrl) {
      return [
        {
          id: `resume-${cand.id}`,
          name: cand.resumeFileName || "Resume.pdf",
          url: cand.resumeUrl,
          size: cand.resumeFileSize,
          mimeType: cand.resumeMimeType,
          type: "Resume",
          createdAt: cand.createdAt,
        },
      ];
    }
    return docs;
  }, [candidate, fullCandidate]);

  const filteredDrawerDocuments = useMemo(() => {
    if (drawerDocFilter === "All") return drawerCandidateDocuments;
    return drawerCandidateDocuments.filter(
      (d) => (d.type || "Resume").toLowerCase() === drawerDocFilter.toLowerCase(),
    );
  }, [drawerCandidateDocuments, drawerDocFilter]);

  const handleDownloadDoc = async (
    docUrl: string,
    docName: string,
    appId?: string,
  ) => {
    const cleanName = fixUtf8String(docName || "document.pdf");
    const downloadEndpoint = appId
      ? `/applications/${appId}/documents/download?url=${encodeURIComponent(docUrl)}&fileName=${encodeURIComponent(cleanName)}`
      : getDocumentUrl(docUrl);

    await downloadAuthenticatedFile(downloadEndpoint, cleanName);
  };

  const handleConfirmDeleteDrawerDoc = async () => {
    if (!drawerDocToDelete || !candidate) return;
    try {
      setIsDeletingDoc(true);
      if (drawerDocToDelete.sourceApplicationId) {
        await deleteAppDocMutation.mutateAsync({
          id: drawerDocToDelete.sourceApplicationId,
          documentId: drawerDocToDelete.id,
          url: drawerDocToDelete.url,
        });
      } else {
        await deleteCandidateDocMutation.mutateAsync({
          id: candidate.id,
          documentId: drawerDocToDelete.id,
          url: drawerDocToDelete.url,
        });
      }
      if (
        drawerPreviewDoc?.id === drawerDocToDelete.id ||
        drawerPreviewDoc?.url === drawerDocToDelete.url
      ) {
        setDrawerPreviewDoc(null);
      }
      setDrawerDocToDelete(null);
    } catch (err) {
      console.error("Failed to delete document in drawer:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleCancelInterview = async (
    app: Application,
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => {
    try {
      let targetId: string | undefined;
      if (typeof interviewOrId === "string") {
        targetId = interviewOrId;
      } else if (
        interviewOrId &&
        typeof interviewOrId === "object" &&
        "id" in interviewOrId &&
        typeof interviewOrId.id === "string"
      ) {
        targetId = interviewOrId.id;
      } else {
        const interviews = getInterviewsFromApplication(app);
        targetId = interviews[0]?.id || (app.interviews && app.interviews[0]?.id);
      }

      if (targetId && typeof targetId === "string") {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  if (!candidate) return null;

  return (
    <>
      <SlideOver
        isOpen={!!candidate}
        onClose={onClose}
        maxWidth="max-w-2xl"
        panelClassName="justify-between overflow-y-auto"
      >
        <div className="p-6 space-y-5 flex-1">
              {/* Drawer Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("candidates.candidateDetail")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/candidates/${candidate.id}/edit`)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={t("common.edit")}
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("common.edit")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/candidates/${candidate.id}`)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={t("candidates.openFullPage")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("candidates.openFullPage")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Candidate Name & Contact Header */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {candidate.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {candidate.email}
                  </span>
                  {candidate.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {candidate.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 1: Details */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {t("common.details")}
                </h3>

                <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">{t("candidates.firstName")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                      {selectedCandidateDetails.firstName || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">{t("candidates.lastName")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                      {selectedCandidateDetails.lastName || "—"}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-slate-400 text-[11px] block">{t("candidates.displayName")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                      {selectedCandidateDetails.displayName || candidate.name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">{t("candidates.email")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                      {candidate.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">{t("candidates.phone")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                      {candidate.phone || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">{t("candidates.gender")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                      {selectedCandidateDetails.gender}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">{t("candidates.dateOfBirth")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                      {selectedCandidateDetails.dob}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("common.created")}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                      {formatDate(candidate.createdAt, "short")}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("common.updated")}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                      {formatDate(candidate.updatedAt || candidate.createdAt, "short")}
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" />
                      {t("candidates.notes")}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedCandidateDetails.customNotes || candidate.notes || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Properties */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {t("common.properties")}
                </h3>
                <button
                  type="button"
                  className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t("candidates.addProperty")}</span>
                </button>
              </div>

              {/* Card 3: Tabs */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                {/* Tabs Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-6 text-xs font-bold -mb-px">
                    <button
                      type="button"
                      onClick={() => setDrawerTab("applications")}
                      className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        drawerTab === "applications"
                          ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                          : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                      }`}
                    >
                      {t("candidates.applicationsTab")} ({selectedCandidateApps.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerTab("documents")}
                      className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        drawerTab === "documents"
                          ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                          : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                      }`}
                    >
                      {t("candidates.documentsTab")} ({drawerCandidateDocuments.length})
                    </button>
                  </div>
                </div>

                {/* Applications Tab */}
                {drawerTab === "applications" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <CustomSelect
                        value={drawerStageFilter}
                        onChange={(v) => setDrawerStageFilter(v)}
                        options={[
                          { value: "ALL", label: t("candidates.allStages") },
                          { value: "APPLIED", label: t("pipeline.stages.applied") },
                          { value: "SCREENING", label: t("pipeline.stages.screening") },
                          { value: "INTERVIEW", label: t("pipeline.stages.interview") },
                          { value: "OFFER", label: t("pipeline.stages.offer") },
                          { value: "HIRED", label: t("pipeline.stages.hired") },
                          { value: "REJECTED", label: t("pipeline.stages.rejected") },
                        ]}
                        size="sm"
                        triggerClassName="h-7 w-28 text-[11px] font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
                      />

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onApplyToJob(candidate)}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{t("candidates.applyToJob")}</span>
                        </button>
                      )}
                    </div>

                    {filteredDrawerApps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center space-y-1.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {selectedCandidateApps.length === 0
                            ? t("candidates.noApplicationsYet")
                            : t("candidates.noApplicationsMatchingStage")}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {selectedCandidateApps.length === 0
                            ? t("candidates.applyCandidateHint")
                            : t("candidates.trySelectingDifferentStage")}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredDrawerApps.map((app: Application) => {
                          const job = jobs.find((j) => j.id === app.jobId);
                          const allInterviews = getInterviewsFromApplication(app);
                          return (
                            <div key={app.id} className="py-4 space-y-3 text-xs">
                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5 min-w-0">
                                  <h4 className="font-bold text-slate-900 dark:text-white truncate">
                                    {job?.title || "Position"}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                    {t("common.status")}: {app.stage} • {t("applications.appliedBadge")} {formatDate(app.createdAt, "short")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <StageBadge stage={app.stage} />
                                  <Link
                                    href={`/dashboard/applications/${app.id}`}
                                    className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                    title={t("applications.viewApplication")}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                  {canEdit && allInterviews.length === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => onScheduleInterview(app)}
                                      className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                    >
                                      <Calendar className="h-3 w-3" />
                                      <span>{t("interviews.scheduleInterview")}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <CandidateInterviewsList
                                application={app}
                                notes={app.notes}
                                onSchedule={(intv) => onScheduleInterview(app, intv)}
                                onCancelInterview={(intv) => handleCancelInterview(app, intv)}
                                canEdit={canEdit}
                                showSectionHeader={false}
                                hideIfEmpty={allInterviews.length === 0}
                              />

                              {app.notes && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 p-2.5 rounded-xl flex items-start gap-2">
                                  <MessageSquare className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{app.notes}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Documents Tab */}
                {drawerTab === "documents" && (
                  <div className="space-y-3">
                    {drawerPreviewDoc ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setDrawerPreviewDoc(null)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>{t("candidates.backToDocuments")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadDoc(
                                drawerPreviewDoc.url,
                                drawerPreviewDoc.name,
                                drawerPreviewDoc.sourceApplicationId,
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t("common.download")}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{drawerPreviewDoc.name}</span>
                        </div>

                        <div className="w-full h-[500px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner">
                          <iframe
                            src={getDocumentUrl(drawerPreviewDoc.url)}
                            className="w-full h-full border-0"
                            title={drawerPreviewDoc.name}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <CustomSelect
                            value={drawerDocFilter}
                            onChange={(v) => setDrawerDocFilter(v)}
                            options={[
                              { value: "All", label: t("common.all") },
                              { value: "Resume", label: t("candidates.resume") },
                              { value: "Cover Letter", label: t("candidates.coverLetter") },
                              { value: "Other", label: t("common.other") },
                            ]}
                            size="sm"
                            triggerClassName="h-7 w-28 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
                          />

                          {canEdit && (
                            <div>
                              <button
                                type="button"
                                disabled={isUploadingDrawerDoc}
                                onClick={() => drawerDocInputRef.current?.click()}
                                className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                {isUploadingDrawerDoc ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UploadCloud className="h-3 w-3 text-slate-500" />
                                )}
                                <span>{t("candidates.uploadDoc")}</span>
                              </button>
                              <input
                                ref={drawerDocInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0] && candidate) {
                                    const file = e.target.files[0];
                                    try {
                                      setIsUploadingDrawerDoc(true);
                                      await uploadCandidateDocMutation.mutateAsync({
                                        id: candidate.id,
                                        file,
                                        type: drawerDocFilter,
                                      });
                                    } catch (err) {
                                      console.error("Failed to upload document in drawer:", err);
                                      toast.error(getApiErrorMessage(err, t));
                                    } finally {
                                      setIsUploadingDrawerDoc(false);
                                      if (drawerDocInputRef.current)
                                        drawerDocInputRef.current.value = "";
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {filteredDrawerDocuments.length > 0 ? (
                          <div className="space-y-2.5">
                            {filteredDrawerDocuments.map((doc) => (
                              <div
                                key={doc.id || doc.url}
                                className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {doc.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap">
                                      <span>{doc.type || t("candidates.resume")}</span>
                                      <span>•</span>
                                      <span>{formatDate(doc.createdAt, "short")}</span>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={() => setDrawerPreviewDoc(doc)}
                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline cursor-pointer"
                                      >
                                        {t("candidates.clickToPreview")}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
                                  <button
                                    type="button"
                                    onClick={() => setDrawerPreviewDoc(doc)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={t("common.preview")}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadDoc(
                                        doc.url,
                                        doc.name,
                                        doc.sourceApplicationId,
                                      )
                                    }
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={t("common.download")}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => setDrawerDocToDelete(doc)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                      title={t("common.delete")}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            onClick={() => drawerDocInputRef.current?.click()}
                            className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 mb-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {t("candidates.noDocuments")}
                            </h4>
                            <p className="text-[10px] text-slate-400 max-w-xs">
                              {t("candidates.uploadDocHint")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
      </SlideOver>

      <DeleteDocumentModal
        isOpen={!!drawerDocToDelete}
        onClose={() => setDrawerDocToDelete(null)}
        onConfirm={handleConfirmDeleteDrawerDoc}
        isLoading={isDeletingDoc}
      />
    </>
  );
}
