"use client";

import type { ReactNode } from "react";
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
} from "lucide-react";
import { isScreeningFileAnswer, isValidHttpUrl } from "@haihire/shared";
import { AiScoreCard } from "@/components/applications/ai-score-card";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useI18n } from "@/i18n";
import type { ActivityEvent } from "@/lib/email-templates";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, CandidateDocument, Interview } from "@/types";

export interface ApplicationDetailTabContentProps {
  activeTab: string;
  app: Application | null | undefined;
  canEdit: boolean;
  candidateDocuments: CandidateDocument[];
  candidateName: string;
  candidateEmail: string;
  candidateInterviews?: Interview[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview?: (intvOrId?: ScheduledInterviewInfo | string) => void;
  customNotesContent?: ReactNode;
  timelineInitialEvents?: ActivityEvent[];
}

/**
 * Shared tab body renderer for Overview, Interviews, Documents, Notes, and Timeline
 * across Application Detail and Pipeline Candidate Detail.
 */
export function ApplicationDetailTabContent({
  activeTab,
  app,
  canEdit,
  candidateDocuments,
  candidateName,
  candidateEmail,
  candidateInterviews,
  onPreviewDoc,
  onDownloadDoc,
  onScheduleInterview,
  onCancelInterview,
  customNotesContent,
  timelineInitialEvents,
}: ApplicationDetailTabContentProps) {
  const { t } = useI18n();

  const coverLetterText =
    typeof app?.coverLetter === "string" ? app.coverLetter.trim() : "";
  const screeningAnswers = Array.isArray(app?.screeningAnswers)
    ? app.screeningAnswers
    : [];

  const renderNotesSection = () => {
    if (customNotesContent !== undefined) {
      return customNotesContent;
    }
    if (!app?.id) return null;
    return (
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs">
        <ApplicationNotesStream applicationId={app.id} />
      </div>
    );
  };

  const renderInterviewsSection = () => (
    <CandidateInterviewsList
      application={app}
      interviews={candidateInterviews}
      onSchedule={onScheduleInterview}
      onCancelInterview={onCancelInterview}
      canEdit={canEdit}
      title={t("applications.sections.interviews")}
      showSectionHeader={true}
    />
  );

  return (
    <div className="space-y-4">
      {activeTab === "overview" && (
        <>
          {app && (
            <AiScoreCard application={app} canScore={canEdit} variant="full" />
          )}

          {coverLetterText && (
            <div
              data-testid="application-cover-letter-card"
              className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-2.5"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <FileText
                  className="h-4 w-4 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span>{t("applications.sections.coverLetter")}</span>
              </div>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {coverLetterText}
              </p>
            </div>
          )}

          {screeningAnswers.length > 0 && (
            <div
              data-testid="application-screening-answers-card"
              className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <HelpCircle
                  className="h-4 w-4 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span>{t("applications.sections.screeningAnswers")}</span>
              </div>
              <div className="divide-y divide-border rounded-lg border border-border bg-background/50">
                {screeningAnswers.map((item) => {
                  if (isScreeningFileAnswer(item.answer)) {
                    const fileAnswer = item.answer;
                    const fileSizeLabel =
                      fileAnswer.size >= 1024 * 1024
                        ? `${(fileAnswer.size / (1024 * 1024)).toFixed(2)} MB`
                        : `${Math.max(1, Math.round(fileAnswer.size / 1024))} KB`;
                    return (
                      <div key={item.questionId} className="p-3 space-y-2">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {item.questionText}
                        </p>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText
                              className="h-3.5 w-3.5 text-primary shrink-0"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {fileAnswer.fileName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {fileSizeLabel}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewDoc({
                                  id: `screening-${item.questionId}`,
                                  name: fileAnswer.fileName,
                                  url: fileAnswer.url,
                                  mimeType: fileAnswer.mimeType,
                                  size: fileAnswer.size,
                                  createdAt:
                                    app?.createdAt || new Date(0).toISOString(),
                                  sourceApplicationId: app?.id,
                                })
                              }
                              className="h-7 px-2.5 rounded-md border border-input bg-background text-[11px] font-medium text-foreground hover:bg-accent inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="h-3 w-3" aria-hidden="true" />
                              <span>{t("common.preview")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onDownloadDoc(
                                  fileAnswer.url,
                                  fileAnswer.fileName,
                                  app?.id,
                                )
                              }
                              className="h-7 px-2.5 rounded-md border border-input bg-background text-[11px] font-medium text-foreground hover:bg-accent inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Download
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span>{t("common.download")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (
                    item.questionType === "url" &&
                    typeof item.answer === "string" &&
                    isValidHttpUrl(item.answer)
                  ) {
                    return (
                      <div key={item.questionId} className="p-3 space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {item.questionText}
                        </p>
                        <a
                          href={item.answer}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline break-all"
                        >
                          <span>{item.answer}</span>
                          <ExternalLink
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      </div>
                    );
                  }

                  let answerDisplay = t(
                    "applications.sections.noAnswerProvided",
                  );
                  if (typeof item.answer === "boolean") {
                    answerDisplay = item.answer
                      ? t("common.yes")
                      : t("common.no");
                  } else if (
                    typeof item.answer === "number" &&
                    Number.isFinite(item.answer)
                  ) {
                    answerDisplay = String(item.answer);
                  } else if (Array.isArray(item.answer)) {
                    if (item.answer.length > 0) {
                      answerDisplay = item.answer.join(", ");
                    }
                  } else if (
                    typeof item.answer === "string" &&
                    item.answer.trim()
                  ) {
                    answerDisplay = item.answer.trim();
                  }

                  return (
                    <div key={item.questionId} className="p-3 space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {item.questionText}
                      </p>
                      <p className="text-xs font-semibold text-foreground whitespace-pre-wrap">
                        {answerDisplay}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {renderInterviewsSection()}

          <ApplicationDocumentsSection
            documents={candidateDocuments}
            appId={app?.id}
            onPreview={onPreviewDoc}
            onDownload={onDownloadDoc}
          />

          {renderNotesSection()}
        </>
      )}

      {activeTab === "interviews" && renderInterviewsSection()}

      {activeTab === "documents" && (
        <ApplicationDocumentsSection
          documents={candidateDocuments}
          appId={app?.id}
          onPreview={onPreviewDoc}
          onDownload={onDownloadDoc}
        />
      )}

      {activeTab === "notes" && renderNotesSection()}

      {activeTab === "timeline" && (
        <CandidateTimeline
          candidateId={app?.candidateId}
          applicationId={app?.id}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          initialEvents={timelineInitialEvents}
        />
      )}
    </div>
  );
}
