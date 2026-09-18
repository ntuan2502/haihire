"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Mail,
  Send,
  Eye,
  Edit3,
  Sparkles,
  CheckCircle2,
  User,
  Briefcase,
} from "lucide-react";
import {
  type EmailTemplateType,
  type EmailLog,
  DEFAULT_EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  interpolateTemplate,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";

import { useEmailTemplates, useSendEmailMutation } from "@/hooks/use-queries";

export interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: {
    id?: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  jobTitle?: string;
  organizationName?: string;
  defaultTemplateType?: EmailTemplateType;
  interviewDetails?: {
    date?: string;
    time?: string;
    format?: string;
    linkOrLocation?: string;
    interviewer?: string;
  };
  onSendSuccess?: (log: EmailLog) => void;
}

export function SendEmailModal({
  isOpen,
  onClose,
  candidate,
  jobTitle = "Vị trí tuyển dụng",
  organizationName = "Công ty Tuyển dụng",
  defaultTemplateType = "APPLICATION_CONFIRMATION",
  interviewDetails,
  onSendSuccess,
}: SendEmailModalProps) {
  const { t } = useI18n();

  const { data: remoteTemplates } = useEmailTemplates();
  const sendEmailMutation = useSendEmailMutation();

  const [selectedType, setSelectedType] =
    useState<EmailTemplateType>(defaultTemplateType);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const bodyInputRef = useRef<HTMLTextAreaElement>(null);

  // Variables map for interpolation
  const variablesMap = useMemo(() => {
    return {
      candidate_name: candidate?.name || "Ứng viên",
      candidate_email: candidate?.email || "candidate@example.com",
      job_title: jobTitle,
      company_name: organizationName,
      interview_date: interviewDetails?.date || "22/09/2026",
      interview_time: interviewDetails?.time || "14:30",
      interview_format: interviewDetails?.format || "Google Meet",
      meeting_link: interviewDetails?.linkOrLocation || "https://meet.google.com/xyz-abcd-efg",
      interviewer_name: interviewDetails?.interviewer || "Hội đồng Phỏng vấn",
      sender_name: "Phòng Tuyển dụng & Nhân sự",
    };
  }, [candidate, jobTitle, organizationName, interviewDetails]);

  // Sync template when selected type changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const matchRemote = remoteTemplates?.find((t) => t.type === selectedType);
      const template = matchRemote || DEFAULT_EMAIL_TEMPLATES[selectedType];
      if (template) {
        setSubject(interpolateTemplate(template.subject, variablesMap));
        setBody(interpolateTemplate(template.body, variablesMap));
      }
      setIsPreviewMode(false);
      setShowSuccessToast(false);
    }
  }, [isOpen, selectedType, variablesMap, remoteTemplates]);

  if (!isOpen || !candidate) return null;

  const handleInsertVariable = (varKey: string) => {
    if (!bodyInputRef.current) {
      setBody((prev) => prev + " " + varKey);
      return;
    }
    const textarea = bodyInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = body.substring(0, start) + varKey + body.substring(end);
    setBody(nextBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSend = async () => {
    try {
      const log = await sendEmailMutation.mutateAsync({
        to: candidate.email,
        recipientName: candidate.name,
        subject,
        body,
        templateType: selectedType,
        candidateId: candidate.id,
      });

      setShowSuccessToast(true);
      onSendSuccess?.(log);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  };

  const isSending = sendEmailMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("email.modalTitle")}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {candidate.name}
                </span>
                <span>•</span>
                <span>{candidate.email}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showSuccessToast && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{t("email.sendSuccessToast")}</span>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("email.selectTemplate")}
            </label>
            <CustomSelect
              value={selectedType}
              onChange={(val) => setSelectedType(val as EmailTemplateType)}
              options={[
                {
                  value: "APPLICATION_CONFIRMATION",
                  label: "✉️ Xác nhận nộp hồ sơ (Application Confirmation)",
                },
                {
                  value: "INTERVIEW_INVITATION",
                  label: "📅 Thư mời phỏng vấn (Interview Invitation)",
                },
                {
                  value: "REJECTION",
                  label: "🤝 Thư từ chối kết quả (Rejection Letter)",
                },
                {
                  value: "OFFER",
                  label: "🏆 Thư mời nhận việc (Job Offer)",
                },
                {
                  value: "CUSTOM",
                  label: "✏️ Soạn thảo email tùy chỉnh",
                },
              ]}
              className="w-full"
              triggerClassName="h-9 text-xs"
            />
          </div>

          {/* Recipient Information Pill */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{t("email.recipient")}:</span>
              <strong className="font-semibold text-slate-900 dark:text-white">
                {candidate.name}
              </strong>
              <span className="text-slate-400">({candidate.email})</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Briefcase className="h-3 w-3 text-slate-400" />
              <span>{jobTitle}</span>
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("email.subject")}
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Nhập tiêu đề email..."
              className="h-9 text-xs"
            />
          </div>

          {/* Edit / Preview Tabs */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  !isPreviewMode
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Edit3 className="h-3 w-3" />
                <span>Soạn thảo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewMode(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isPreviewMode
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>{t("email.livePreview")}</span>
              </button>
            </div>

            {!isPreviewMode && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>HTML & Biến tự động</span>
              </span>
            )}
          </div>

          {/* Body Editor or Preview Mode */}
          {!isPreviewMode ? (
            <div className="space-y-2">
              <textarea
                ref={bodyInputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                placeholder="Nhập nội dung thư..."
              />

              {/* Variable Insertion Pills */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  <span>{t("email.insertVariableHint")}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shadow-2xs"
                      title={v.label}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Live HTML Preview */
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 text-xs space-y-1 text-slate-500">
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Tiêu đề:</strong>{" "}
                  {subject}
                </div>
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Người nhận:</strong>{" "}
                  {candidate.name} &lt;{candidate.email}&gt;
                </div>
              </div>
              <div
                className="prose prose-xs dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            className="text-xs font-semibold cursor-pointer"
          >
            {t("email.cancel")}
          </Button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim()}
            className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSending ? t("email.sendingBtn") : t("email.sendBtn")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
