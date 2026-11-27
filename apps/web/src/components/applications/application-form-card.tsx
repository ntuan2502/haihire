"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
} from "lucide-react";
import {
  isScreeningFileAnswer,
  isValidHttpUrl,
  type ScreeningQuestionType,
} from "@haihire/shared";
import { Button } from "@/components/ui/button";
import { ApplicationSectionCard } from "@/components/applications/detail/application-section-card";
import { useI18n } from "@/i18n";
import type { Application, CandidateDocument } from "@/types";

export interface ApplicationFormCardProps {
  application: Application;
  onPreviewDoc?: (doc: CandidateDocument) => void;
  onDownloadDoc?: (
    url: string,
    filename?: string,
    targetAppId?: string,
  ) => void;
  showEmptyState?: boolean;
}

interface FormAccordionEntry {
  key: string;
  questionText: string;
  typeKey: ScreeningQuestionType | "cover_letter";
  rawAnswer: unknown;
}

function getTypeLabel(
  typeKey: FormAccordionEntry["typeKey"],
  t: (key: string) => string,
): string {
  return t(`applications.formCard.types.${typeKey}`);
}

function formatFileSizeLabel(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function buildCompactPreviewText(
  rawAnswer: unknown,
  t: (key: string) => string,
): string {
  if (isScreeningFileAnswer(rawAnswer)) {
    return rawAnswer.fileName;
  }
  if (typeof rawAnswer === "boolean") {
    return rawAnswer ? t("common.yes") : t("common.no");
  }
  if (typeof rawAnswer === "number" && Number.isFinite(rawAnswer)) {
    return String(rawAnswer);
  }
  if (Array.isArray(rawAnswer)) {
    return rawAnswer.length > 0
      ? rawAnswer.join(", ")
      : t("applications.sections.noAnswerProvided");
  }
  if (typeof rawAnswer === "string" && rawAnswer.trim()) {
    return rawAnswer.trim();
  }
  return t("applications.sections.noAnswerProvided");
}

export function ApplicationFormCard({
  application,
  onPreviewDoc,
  onDownloadDoc,
  showEmptyState = false,
}: ApplicationFormCardProps) {
  const { t } = useI18n();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);

  const entries = useMemo<FormAccordionEntry[]>(() => {
    const items: FormAccordionEntry[] = [];
    const coverLetterText =
      typeof application.coverLetter === "string"
        ? application.coverLetter.trim()
        : "";
    if (coverLetterText) {
      items.push({
        key: "cover-letter",
        questionText: t("applications.sections.coverLetter"),
        typeKey: "cover_letter",
        rawAnswer: coverLetterText,
      });
    }

    const screeningAnswers = Array.isArray(application.screeningAnswers)
      ? application.screeningAnswers
      : [];
    for (const ans of screeningAnswers) {
      items.push({
        key: ans.questionId,
        questionText: ans.questionText,
        typeKey: ans.questionType || "short_text",
        rawAnswer: ans.answer,
      });
    }
    return items;
  }, [application.coverLetter, application.screeningAnswers, t]);

  useEffect(() => {
    setExpandedKeys([]);
  }, [application.id]);

  const isFormEmpty = entries.length === 0;

  if (isFormEmpty && !showEmptyState) {
    return null;
  }

  if (isFormEmpty) {
    return (
      <ApplicationSectionCard
        icon={ClipboardList}
        title={t("applications.formCard.title")}
        statusMeta={
          <span className="text-xs text-muted-foreground">
            {t("applications.formCard.emptyBadge")}
          </span>
        }
        collapsible
        collapsed={isCardCollapsed}
        onToggleCollapse={() => setIsCardCollapsed((prev) => !prev)}
        bodyDivider
        testId="application-form-card"
      >
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("applications.formCard.emptyState")}
        </p>
      </ApplicationSectionCard>
    );
  }

  const allExpanded =
    entries.length > 0 &&
    entries.every((item) => expandedKeys.includes(item.key));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedKeys([]);
    } else {
      setExpandedKeys(entries.map((item) => item.key));
    }
  };

  const toggleEntry = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <ApplicationSectionCard
      icon={ClipboardList}
      title={t("applications.formCard.title")}
      statusMeta={
        <span className="text-xs text-muted-foreground">
          {t("applications.formCard.itemsCount", { count: entries.length })}
        </span>
      }
      headerActions={
        !isCardCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleExpandAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {allExpanded
                ? t("applications.aiEvaluation.collapseAll")
                : t("applications.aiEvaluation.expandAll")}
            </span>
          </Button>
        ) : null
      }
      collapsible
      collapsed={isCardCollapsed}
      onToggleCollapse={() => setIsCardCollapsed((prev) => !prev)}
      testId="application-form-card"
    >
      {/* Accordion Rows */}
      <div className="divide-y divide-border rounded-xl border border-border bg-background/40 overflow-hidden">
        {entries.map((entry) => {
          const isOpen = expandedKeys.includes(entry.key);
          const previewText = buildCompactPreviewText(entry.rawAnswer, t);
          const isChoiceArray =
            Array.isArray(entry.rawAnswer) && entry.rawAnswer.length > 0;

          return (
            <div key={entry.key}>
              <button
                type="button"
                onClick={() => toggleEntry(entry.key)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {entry.questionText}
                  </p>
                  {!isOpen && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {previewText}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {getTypeLabel(entry.typeKey, t)}
                  </span>
                  {isOpen ? (
                    <ChevronUp
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border/60 bg-card/30 space-y-2.5 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("applications.formCard.answerLabel")}
                  </p>

                  {isScreeningFileAnswer(entry.rawAnswer) ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-md border border-border bg-card px-2.5 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText
                          className="h-3.5 w-3.5 text-primary shrink-0"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {entry.rawAnswer.fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSizeLabel(entry.rawAnswer.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {onPreviewDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isScreeningFileAnswer(entry.rawAnswer)) {
                                return;
                              }
                              onPreviewDoc({
                                id: `screening-${entry.key}`,
                                name: entry.rawAnswer.fileName,
                                url: entry.rawAnswer.url,
                                mimeType: entry.rawAnswer.mimeType,
                                size: entry.rawAnswer.size,
                                createdAt:
                                  application.createdAt ||
                                  new Date(0).toISOString(),
                                sourceApplicationId: application.id,
                              });
                            }}
                            className="h-7 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Eye
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span>{t("common.preview")}</span>
                          </button>
                        )}
                        {onDownloadDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isScreeningFileAnswer(entry.rawAnswer)) {
                                return;
                              }
                              onDownloadDoc(
                                entry.rawAnswer.url,
                                entry.rawAnswer.fileName,
                                application.id,
                              );
                            }}
                            className="h-7 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Download
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span>{t("common.download")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : entry.typeKey === "url" &&
                    typeof entry.rawAnswer === "string" &&
                    isValidHttpUrl(entry.rawAnswer) ? (
                    <a
                      href={entry.rawAnswer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline break-all"
                    >
                      <span>{entry.rawAnswer}</span>
                      <ExternalLink
                        className="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  ) : isChoiceArray ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(entry.rawAnswer as string[]).map((opt) => (
                        <span
                          key={opt}
                          className="inline-flex items-center rounded-md border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium text-foreground"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                      {previewText}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ApplicationSectionCard>
  );
}
