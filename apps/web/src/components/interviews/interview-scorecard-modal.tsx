"use client";

import { useState, useEffect, useId, useRef, type FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FormModal } from "@/components/shared";
import { Star, AlertCircle, Briefcase, Calendar } from "lucide-react";
import {
  ScorecardRecommendationPicker,
  type ScorecardRecommendation,
} from "./scorecard-recommendation-picker";
import { useAuth } from "@/context/auth-context";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSubmitScorecardMutation } from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { formatDate, formatTime, getCandidateDisplayName } from "@/lib/utils";
import {
  type ScheduledInterviewInfo,
  type InterviewScorecard,
} from "@/lib/interviews";
import type { Application, Job } from "@/types";

export interface InterviewScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  application?: Application;
  interview?: ScheduledInterviewInfo;
  job?: Job;
  onSaved?: () => void;
}

export function InterviewScorecardModal({
  isOpen,
  onClose,
  application,
  interview,
  job,
  onSaved,
}: InterviewScorecardModalProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;
  const feedbackId = useId();
  const submitScorecardMutation = useSubmitScorecardMutation();
  const canSubmitScorecard = useHasPermission("interview:scorecard_submit");

  const [overallRating, setOverallRating] = useState<number>(4);
  const [recommendation, setRecommendation] =
    useState<ScorecardRecommendation>("YES");
  const [technicalScore, setTechnicalScore] = useState<number>(4);
  const [communicationScore, setCommunicationScore] = useState<number>(4);
  const [cultureScore, setCultureScore] = useState<number>(4);
  const [problemSolvingScore, setProblemSolvingScore] = useState<number>(4);
  const [feedback, setFeedback] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initializedSessionRef = useRef<string | null>(null);

  // Sync existing scorecard once per (isOpen, interview.id) session so background SSE refetches don't wipe unsaved input
  useEffect(() => {
    if (!isOpen || !interview) {
      initializedSessionRef.current = null;
      return;
    }
    const sessionKey = interview.id || "__active__";
    if (initializedSessionRef.current === sessionKey) {
      return;
    }
    initializedSessionRef.current = sessionKey;

    setErrorMsg(null);
    if (interview.scorecard) {
      setOverallRating(interview.scorecard.overallRating || 4);
      setRecommendation(interview.scorecard.recommendation || "YES");
      setTechnicalScore(interview.scorecard.technicalScore || 4);
      setCommunicationScore(interview.scorecard.communicationScore || 4);
      setCultureScore(interview.scorecard.cultureScore || 4);
      setProblemSolvingScore(interview.scorecard.problemSolvingScore || 4);
      setFeedback(interview.scorecard.feedback || "");
    } else {
      setOverallRating(4);
      setRecommendation("YES");
      setTechnicalScore(4);
      setCommunicationScore(4);
      setCultureScore(4);
      setProblemSolvingScore(4);
      setFeedback("");
    }
  }, [isOpen, interview]);

  if (!application || !interview) return null;

  const isSaving = submitScorecardMutation.isPending;
  const isDisabled = !canSubmitScorecard || isSaving;
  const candidateName = getCandidateDisplayName(application, locOverrides);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmitScorecard || isSaving || !interview.id) return;
    setErrorMsg(null);
    try {
      const scorecardData: InterviewScorecard = {
        overallRating,
        recommendation,
        technicalScore,
        communicationScore,
        cultureScore,
        problemSolvingScore,
        feedback: feedback.trim() || undefined,
        evaluatedBy: user?.name || t("interviews.interviewer"),
        evaluatedAt: new Date().toISOString(),
      };

      await submitScorecardMutation.mutateAsync({
        id: interview.id,
        scorecard: scorecardData,
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save interview scorecard:", err);
      setErrorMsg(
        getApiErrorMessage(err, t, "interviews.errors.saveScorecardFailed"),
      );
    }
  };

  // Helper for interactive star rating
  const renderStarRating = (
    value: number,
    onChange: (val: number) => void,
    size: "md" | "lg" = "md",
  ) => {
    const starSize = size === "lg" ? "h-6 w-6" : "h-4 w-4";
    return (
      <div className="flex items-center gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isDisabled}
            aria-label={`${star}/5`}
            onClick={() => onChange(star)}
            className={`p-1 rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
              !isDisabled
                ? "hover:bg-accent cursor-pointer"
                : "cursor-default opacity-80"
            }`}
          >
            <Star
              className={`${starSize} ${
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    );
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 5:
        return `${t("interviews.ratings.excellent")} (5/5)`;
      case 4:
        return `${t("interviews.ratings.good")} (4/5)`;
      case 3:
        return `${t("interviews.ratings.meetsExpectations")} (3/5)`;
      case 2:
        return `${t("interviews.ratings.belowExpectations")} (2/5)`;
      case 1:
        return `${t("interviews.ratings.poor")} (1/5)`;
      default:
        return `${score}/5`;
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSave}
      title={t("interviews.scorecardTitle")}
      badge={
        <span className="text-[11px] font-semibold text-foreground">
          {candidateName}
        </span>
      }
      size="xl"
      isSubmitting={isSaving}
      submitDisabled={!canSubmitScorecard || !interview.id}
      submitLabel={t("interviews.saveScorecard")}
      savingLabel={t("common.saving")}
      cancelLabel={t("common.close")}
      error={errorMsg}
      bodyClassName="p-0 space-y-0 bg-background"
    >
      {/* Candidate & Interview Summary Strip */}
      <div className="p-4 sm:px-6 border-b border-border bg-card text-card-foreground flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shrink-0">
            {candidateName.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-foreground block truncate">
              {candidateName}
            </span>
            <span className="text-[11px] text-muted-foreground block truncate max-w-[200px]">
              {application.candidateEmail}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-1 font-medium">
            <Briefcase
              className="h-3.5 w-3.5 text-primary"
              aria-hidden="true"
            />
            <span className="truncate max-w-[140px]">
              {job?.title || t("interviews.defaultJob")}
            </span>
          </div>

          <div className="flex items-center gap-1 font-medium">
            <Calendar
              className="h-3.5 w-3.5 text-emerald-500"
              aria-hidden="true"
            />
            <span>
              {formatDate(interview.scheduledAt, "numeric", locOverrides)} (
              {formatTime(interview.scheduledAt, locOverrides)})
            </span>
          </div>

          {interview.round && (
            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
              {t("interviews.round")} {interview.round}
            </span>
          )}
        </div>
      </div>

      {/* Modal Body */}
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {!canSubmitScorecard && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle
              className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span>{t("interviews.scorecardNoPermission")}</span>
          </div>
        )}

        {/* 1. Overall Rating Hero Card */}
        <div className="p-5 rounded-xl bg-card text-card-foreground border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-foreground">
              {t("interviews.overallRatingTitle")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {getScoreLabel(overallRating)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {renderStarRating(overallRating, setOverallRating, "lg")}
            <span className="text-2xl font-semibold font-mono tabular-nums text-amber-500 dark:text-amber-400 min-w-8 text-center">
              {overallRating}
            </span>
          </div>
        </div>

        {/* 2. Recommendation Decision Buttons */}
        <ScorecardRecommendationPicker
          value={recommendation}
          disabled={isDisabled}
          onChange={setRecommendation}
        />

        {/* 3. Detailed Criteria Assessment */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground block">
            {t("interviews.criteriaTitle")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Technical Skills */}
            <div className="p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {t("interviews.technicalCriteria")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("interviews.technicalDesc")}
                </p>
              </div>
              {renderStarRating(technicalScore, setTechnicalScore)}
            </div>

            {/* Communication Skills */}
            <div className="p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {t("interviews.communicationCriteria")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("interviews.communicationDesc")}
                </p>
              </div>
              {renderStarRating(communicationScore, setCommunicationScore)}
            </div>

            {/* Culture Fit */}
            <div className="p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {t("interviews.cultureFitCriteria")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("interviews.cultureFitDesc")}
                </p>
              </div>
              {renderStarRating(cultureScore, setCultureScore)}
            </div>

            {/* Problem Solving */}
            <div className="p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {t("interviews.problemSolvingCriteria")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("interviews.problemSolvingDesc")}
                </p>
              </div>
              {renderStarRating(problemSolvingScore, setProblemSolvingScore)}
            </div>
          </div>
        </div>

        {/* 4. Detailed Feedback & Comments */}
        <div className="space-y-1.5">
          <label
            htmlFor={feedbackId}
            className="text-xs font-bold text-foreground"
          >
            {t("interviews.detailedFeedback")}
          </label>
          <Textarea
            id={feedbackId}
            rows={4}
            disabled={isDisabled}
            placeholder={t("interviews.feedbackPlaceholder")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="rounded-lg text-xs resize-none disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </FormModal>
  );
}
