"use client";

import { useState, useEffect, useMemo, useRef, type ElementType } from "react";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  RotateCcw,
  Save,
  FileText,
  Calendar,
  UserCheck,
  Award,
} from "lucide-react";
import {
  type EmailTemplateType,
  type EmailTemplate,
  DEFAULT_EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  interpolateTemplate,
} from "@/lib/email-templates";
import { useI18n, type TranslationKey } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailPreviewModal } from "@/components/email/email-preview-modal";
import {
  useEmailTemplates,
  useUpdateEmailTemplateMutation,
  useEmailSettings,
} from "@/hooks/use-queries";

export default function EmailTemplatesSettingsPage() {
  const { t } = useI18n();

  // Backend queries & mutations
  const { data: remoteTemplates } = useEmailTemplates();
  const updateTemplateMutation = useUpdateEmailTemplateMutation();
  const { data: remoteSettings } = useEmailSettings();

  // Templates state
  const [templates, setTemplates] = useState<Record<EmailTemplateType, EmailTemplate>>(
    DEFAULT_EMAIL_TEMPLATES,
  );
  const [selectedType, setSelectedType] =
    useState<EmailTemplateType>("APPLICATION_CONFIRMATION");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [templateToast, setTemplateToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync remote templates when fetched
  useEffect(() => {
    if (remoteTemplates && remoteTemplates.length > 0) {
      setTemplates((prev) => {
        const next = { ...prev };
        for (const tpl of remoteTemplates) {
          if (next[tpl.type]) {
            next[tpl.type] = {
              ...next[tpl.type],
              subject: tpl.subject ?? next[tpl.type].subject,
              body: tpl.body ?? next[tpl.type].body,
              enabled: tpl.enabled ?? next[tpl.type].enabled,
            };
          }
        }
        return next;
      });
    }
  }, [remoteTemplates]);

  const activeTemplate = templates[selectedType] || DEFAULT_EMAIL_TEMPLATES[selectedType];
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const senderName = remoteSettings?.fromName || t("email.defaultSenderName");
  const senderEmail = remoteSettings?.fromEmail || "careers@nexus.com";

  // Sample variable values for live preview
  const sampleVariables = useMemo(() => {
    return {
      candidate_name: t("email.sampleCandidateName"),
      candidate_email: "an.nguyen@example.com",
      job_title: "Senior Frontend Engineer",
      company_name: "Nexus Corporation",
      interview_date: "22/09/2026",
      interview_time: "14:30",
      interview_format: "Google Meet",
      meeting_link: "https://meet.google.com/xyz-abcd-efg",
      interviewer_name: t("email.sampleInterviewerName"),
      sender_name: senderName,
    };
  }, [senderName, t]);

  const previewSubject = useMemo(() => {
    return interpolateTemplate(activeTemplate.subject, sampleVariables);
  }, [activeTemplate.subject, sampleVariables]);

  const previewBody = useMemo(() => {
    return interpolateTemplate(activeTemplate.body, sampleVariables);
  }, [activeTemplate.body, sampleVariables]);

  // Insert variable into active template body
  const handleInsertVariable = (varKey: string) => {
    if (!bodyTextareaRef.current) {
      setTemplates((prev) => ({
        ...prev,
        [selectedType]: {
          ...prev[selectedType],
          body: (prev[selectedType]?.body || "") + " " + varKey,
        },
      }));
      return;
    }

    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = activeTemplate.body || "";
    const nextBody = currentBody.substring(0, start) + varKey + currentBody.substring(end);

    setTemplates((prev) => ({
      ...prev,
      [selectedType]: {
        ...prev[selectedType],
        body: nextBody,
      },
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;
    try {
      await updateTemplateMutation.mutateAsync({
        type: selectedType,
        data: {
          subject: (activeTemplate.subject || "").trim(),
          body: activeTemplate.body || "",
          enabled: Boolean(activeTemplate.enabled),
        },
      });
      setTemplateToast({ type: "success", text: t("email.templateSavedSuccess") });
      setTimeout(() => setTemplateToast(null), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || t("email.templateSaveError");
      setTemplateToast({ type: "error", text: msg });
      setTimeout(() => setTemplateToast(null), 4000);
    }
  };

  const handleResetDefault = () => {
    setTemplates((prev) => ({
      ...prev,
      [selectedType]: { ...DEFAULT_EMAIL_TEMPLATES[selectedType] },
    }));
    setTemplateToast({ type: "success", text: t("email.templateResetSuccess") });
    setTimeout(() => setTemplateToast(null), 3000);
  };

  const templateIcons: Record<EmailTemplateType, ElementType> = {
    APPLICATION_CONFIRMATION: FileText,
    INTERVIEW_INVITATION: Calendar,
    REJECTION: UserCheck,
    OFFER: Award,
    CUSTOM: Mail,
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Template Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          [
            "APPLICATION_CONFIRMATION",
            "INTERVIEW_INVITATION",
            "REJECTION",
            "OFFER",
          ] as EmailTemplateType[]
        ).map((typeKey) => {
          const tpl = templates[typeKey];
          const isSelected = selectedType === typeKey;
          const IconComp = templateIcons[typeKey] || Mail;

          return (
            <button
              key={typeKey}
              type="button"
              onClick={() => setSelectedType(typeKey)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs ring-2 ring-blue-600/20"
                  : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`p-2 rounded-xl ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <IconComp className="h-4 w-4" />
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    tpl.enabled
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700"
                  }`}
                >
                  {tpl.enabled ? t("email.statusEnabled") : t("email.statusDisabled")}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {tpl.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {tpl.subject}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback Toast */}
      {templateToast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
            templateToast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
          }`}
        >
          {templateToast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{templateToast.text}</span>
        </div>
      )}

      {/* Full-width Template Form Editor */}
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 min-w-0">
        {/* Editor Top Toolbar: Auto-send switch + Preview Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableAutoSendCheckbox"
              checked={Boolean(activeTemplate?.enabled)}
              onChange={(e) =>
                setTemplates((prev) => ({
                  ...prev,
                  [selectedType]: {
                    ...prev[selectedType],
                    enabled: e.target.checked,
                  },
                }))
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
            />
            <div>
              <label
                htmlFor="enableAutoSendCheckbox"
                className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                {t("email.enableAutoSend")}
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("email.enableAutoSendDesc")}
              </p>
            </div>
          </div>

          {/* Separate Preview Button (like Job Candidate Preview) */}
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
          >
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{t("email.livePreview")}</span>
          </button>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {t("email.subject")}
          </label>
          <Input
            value={activeTemplate?.subject ?? ""}
            onChange={(e) =>
              setTemplates((prev) => ({
                ...prev,
                [selectedType]: {
                  ...prev[selectedType],
                  subject: e.target.value,
                },
              }))
            }
            className="h-9 text-xs"
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t("email.body")}
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              HTML / Template Variables
            </span>
          </div>
          <textarea
            ref={bodyTextareaRef}
            value={activeTemplate?.body ?? ""}
            onChange={(e) =>
              setTemplates((prev) => ({
                ...prev,
                [selectedType]: {
                  ...prev[selectedType],
                  body: e.target.value,
                },
              }))
            }
            rows={14}
            className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Variable Insertion Pills */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>{t("email.insertVariableHint")}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleInsertVariable(v.key)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shadow-2xs"
                title={t(v.labelKey as TranslationKey) || v.label}
              >
                {v.key}
              </button>
            ))}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefault}
            disabled={updateTemplateMutation.isPending}
            className="w-full sm:w-auto justify-center text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("email.resetDefault")}</span>
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
              className="w-full sm:w-auto justify-center h-9 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1.5 rounded-xl shadow-2xs"
            >
              <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t("email.livePreview")}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={updateTemplateMutation.isPending}
              className="w-full sm:w-auto justify-center h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {updateTemplateMutation.isPending
                  ? t("common.saving")
                  : t("email.saveTemplate")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Reusable Email Live Preview Modal with macOS Window Bar */}
      <EmailPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        subject={previewSubject}
        body={previewBody}
        senderName={senderName}
        senderEmail={senderEmail}
        templateName={activeTemplate.name}
      />
    </div>
  );
}
