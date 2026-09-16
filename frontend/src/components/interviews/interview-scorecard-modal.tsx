"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUpdateCandidateMutation } from "@/hooks/use-queries";
import { getCandidateDisplayName } from "@/lib/utils";
import {
  type ScheduledInterviewInfo,
  type InterviewScorecard,
  saveInterviewScorecardToNotes,
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
  const updateCandidateMutation = useUpdateCandidateMutation();

  const [overallRating, setOverallRating] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<
    "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO"
  >("YES");
  const [technicalScore, setTechnicalScore] = useState<number>(4);
  const [communicationScore, setCommunicationScore] = useState<number>(4);
  const [cultureScore, setCultureScore] = useState<number>(4);
  const [problemSolvingScore, setProblemSolvingScore] = useState<number>(4);
  const [feedback, setFeedback] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync existing scorecard if available
  useEffect(() => {
    if (!isOpen || !interview) return;
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

  const candidateName = getCandidateDisplayName(application);

  const handleSave = async () => {
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
        evaluatedBy: user?.name || "Interviewer",
        evaluatedAt: new Date().toISOString(),
      };

      const updatedNotes = saveInterviewScorecardToNotes(
        application.notes,
        interview,
        scorecardData,
      );

      await updateCandidateMutation.mutateAsync({
        id: application.id,
        data: {
          notes: updatedNotes,
        },
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save interview scorecard:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra khi lưu phiếu đánh giá. Vui lòng thử lại.",
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
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 rounded-md hover:scale-115 transition-transform cursor-pointer focus:outline-hidden"
          >
            <Star
              className={`${starSize} ${
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 dark:text-slate-700 hover:text-amber-300"
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 5:
        return "Xuất sắc (5/5)";
      case 4:
        return "Tốt (4/5)";
      case 3:
        return "Đạt yêu cầu (3/5)";
      case 2:
        return "Dưới kỳ vọng (2/5)";
      case 1:
        return "Không đạt (1/5)";
      default:
        return `${score}/5`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl gap-0 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl font-sans">
        {/* Modal Header */}
        <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Phiếu Đánh giá Phỏng vấn (Scorecard)
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chấm điểm tiêu chí và đưa ra đề xuất tuyển dụng cho ứng viên sau buổi phỏng vấn.
              </p>
            </div>
          </div>

          {/* Candidate & Interview Summary Strip */}
          <div className="mt-4 p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                {candidateName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{candidateName}</span>
                <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                  {application.candidateEmail}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1 font-medium">
                <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                <span className="truncate max-w-[140px]">{job?.title || "Vị trí tuyển"}</span>
              </div>

              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                <span>
                  {interview.date} ({interview.time})
                </span>
              </div>

              {interview.round && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                  Vòng {interview.round}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Recommendation Decision */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Đề xuất tuyển dụng (Hiring Recommendation)</span>
              <span className="text-[11px] font-normal text-slate-400">Bắt buộc</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRecommendation("STRONG_YES")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  recommendation === "STRONG_YES"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tuyển ngay</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Rất xuất sắc, đạt trọn vẹn tiêu chí
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("YES")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  recommendation === "YES"
                    ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Check className="h-3.5 w-3.5 text-blue-600" />
                  <span>Đồng ý</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Đạt yêu cầu chuyên môn
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("NEUTRAL")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  recommendation === "NEUTRAL"
                    ? "bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Cân nhắc</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Cần thảo luận thêm / Vòng phụ
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation("NO")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  recommendation === "NO" || recommendation === "STRONG_NO"
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
                  <span>Không đạt</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Chưa phù hợp với vị trí này
                </p>
              </button>
            </div>
          </div>

          {/* 2. Overall Rating Stars */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Điểm Đánh Giá Tổng Thể
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Mức độ ấn tượng chung về năng lực và tiềm năng của ứng viên
              </span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {getScoreLabel(overallRating)}
              </span>
              {renderStarRating(overallRating, setOverallRating, "lg")}
            </div>
          </div>

          {/* 3. Core Competencies Criteria (4 items) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Đánh Giá Theo Bộ Tiêu Chí (Competency Breakdown)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Technical / Professional */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Kỹ năng Chuyên môn
                  </p>
                  <p className="text-[10px] text-slate-400">Kiến thức chuyên sâu & nghiệp vụ</p>
                </div>
                {renderStarRating(technicalScore, setTechnicalScore)}
              </div>

              {/* Communication */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Giao tiếp & Ứng xử
                  </p>
                  <p className="text-[10px] text-slate-400">Truyền đạt rõ ràng, lắng nghe tốt</p>
                </div>
                {renderStarRating(communicationScore, setCommunicationScore)}
              </div>

              {/* Culture Fit */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Phù hợp Văn hóa
                  </p>
                  <p className="text-[10px] text-slate-400">Thái độ tích cực, tinh thần đội nhóm</p>
                </div>
                {renderStarRating(cultureScore, setCultureScore)}
              </div>

              {/* Problem Solving */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Giải quyết Vấn đề
                  </p>
                  <p className="text-[10px] text-slate-400">Tư duy logic, giải pháp tình huống</p>
                </div>
                {renderStarRating(problemSolvingScore, setProblemSolvingScore)}
              </div>
            </div>
          </div>

          {/* 4. Detailed Feedback & Comments */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Nhận xét chi tiết & Ghi chú phỏng vấn
            </label>
            <Textarea
              rows={4}
              placeholder="Nhập điểm mạnh nổi bật, điểm cần lưu ý cải thiện hoặc câu hỏi khuyến nghị cho vòng phỏng vấn tiếp theo..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="rounded-2xl text-xs resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Đóng
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={updateCandidateMutation.isPending}
            className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            {updateCandidateMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Lưu Phiếu Đánh Giá</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
