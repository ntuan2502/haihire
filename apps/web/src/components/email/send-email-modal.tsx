"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Send, Eye, Edit3, Sparkles, User, Briefcase } from "lucide-react";
import {
  type EmailFlowKey,
  type EmailTemplateType,
  type EmailLog,
  DEFAULT_EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  getEmailTemplateTypeLabel,
  interpolateTemplate,
} from "@/lib/email-templates";
import { useI18n, type TranslationKey } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect, CustomModal } from "@/components/shared";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatTime, getCandidateDisplayName } from "@/lib/utils";
import { EmailHtmlPreview } from "./email-html-preview";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useEmailFlows } from "@/hooks/use-email-queries";
import { useEmailTemplates, useSendEmailMutation } from "@/hooks/use-queries";

const ADHOC_TEMPLATE_VALUE = "__ADHOC__";
const STATIC_TEMPLATE_PREFIX = "__STATIC__";

export interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: {
    id?: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    email: string;
    phone?: string | null;
  } | null;
  jobTitle?: string;
  organizationName?: string;
  defaultTemplateType?: EmailTemplateType;
  defaultFlowKey?: EmailFlowKey;
  interviewDetails?: {
    scheduledAt?: string;
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
  jobTitle,
  organizationName,
  defaultTemplateType = "APPLICATION_CONFIRMATION",
  defaultFlowKey,
  interviewDetails,
  onSendSuccess,
}: SendEmailModalProps) {
  const { t } = useI18n();
  const canViewEmail = useHasPermission("email:view");

  const candidateDisplayName = candidate
    ? getCandidateDisplayName(candidate)
    : "";
  const effectiveJobTitle = jobTitle || t("email.defaultJobTitle");
  const effectiveOrgName = organizationName || t("email.defaultOrgName");

  const { data: remoteTemplates } = useEmailTemplates();
  const { data: remoteFlows } = useEmailFlows(undefined, {
    enabled: isOpen && canViewEmail && Boolean(defaultFlowKey),
  });
  const sendEmailMutation = useSendEmailMutation();

  const activeTemplates = useMemo(
    () => (remoteTemplates ?? []).filter((tpl) => Boolean(tpl.enabled)),
    [remoteTemplates],
  );

  const templateOptions = useMemo(() => {
    if (activeTemplates.length > 0) {
      return [
        ...activeTemplates.map((tpl) => ({
          value: tpl.id,
          label: `${tpl.name} (${getEmailTemplateTypeLabel(tpl.type, t)})`,
        })),
        {
          value: ADHOC_TEMPLATE_VALUE,
          label: `✏️ ${t("email.customAdHocOption")}`,
        },
      ];
    }

    const staticTypes: EmailTemplateType[] = [
      "APPLICATION_CONFIRMATION",
      "INTERVIEW_INVITATION",
      "REJECTION",
      "OFFER",
    ];
    return [
      ...staticTypes.map((typeKey) => ({
        value: `${STATIC_TEMPLATE_PREFIX}${typeKey}`,
        label: getEmailTemplateTypeLabel(typeKey, t),
      })),
      {
        value: ADHOC_TEMPLATE_VALUE,
        label: `✏️ ${t("email.customAdHocOption")}`,
      },
    ];
  }, [activeTemplates, t]);

  const resolvedDefaultValue = useMemo(() => {
    if (defaultFlowKey && remoteFlows) {
      const matchedFlow = remoteFlows.find(
        (flow) => flow.flowKey === defaultFlowKey,
      );
      if (
        matchedFlow?.templateId &&
        activeTemplates.some((tpl) => tpl.id === matchedFlow.templateId)
      ) {
        return matchedFlow.templateId;
      }
    }
    if (activeTemplates.length > 0) {
      const byType = activeTemplates.find(
        (tpl) => tpl.type === defaultTemplateType,
      );
      return byType ? byType.id : activeTemplates[0].id;
    }
    if (defaultTemplateType === "CUSTOM") {
      return ADHOC_TEMPLATE_VALUE;
    }
    return `${STATIC_TEMPLATE_PREFIX}${defaultTemplateType}`;
  }, [defaultFlowKey, remoteFlows, activeTemplates, defaultTemplateType]);

  const [selectedValue, setSelectedValue] =
    useState<string>(resolvedDefaultValue);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const wasOpenRef = useRef(false);
  const hasManualSelectionRef = useRef(false);

  // Variables map for interpolation
  const variablesMap = useMemo(() => {
    return {
      candidate_name: candidateDisplayName || t("email.defaultCandidateName"),
      candidate_email: candidate?.email || "candidate@example.com",
      job_title: effectiveJobTitle,
      company_name: effectiveOrgName,
      interview_date: interviewDetails?.scheduledAt
        ? formatDate(interviewDetails.scheduledAt)
        : "22/09/2026",
      interview_time: interviewDetails?.scheduledAt
        ? formatTime(interviewDetails.scheduledAt)
        : "14:30",
      interview_format: interviewDetails?.format || "Google Meet",
      interview_link:
        interviewDetails?.linkOrLocation ||
        "https://meet.google.com/xyz-abcd-efg",
      interviewer_name:
        interviewDetails?.interviewer || t("email.defaultInterviewerName"),
      sender_name: t("email.defaultSenderName"),
    };
  }, [
    candidateDisplayName,
    candidate?.email,
    effectiveJobTitle,
    effectiveOrgName,
    interviewDetails,
    t,
  ]);

  const applyTemplateByValue = useCallback(
    (value: string) => {
      if (value === ADHOC_TEMPLATE_VALUE) {
        const template = DEFAULT_EMAIL_TEMPLATES.CUSTOM;
        setSubject(interpolateTemplate(template.subject, variablesMap));
        setBody(interpolateTemplate(template.body, variablesMap));
        return;
      }
      if (value.startsWith(STATIC_TEMPLATE_PREFIX)) {
        const typeKey = value.slice(
          STATIC_TEMPLATE_PREFIX.length,
        ) as EmailTemplateType;
        const template =
          DEFAULT_EMAIL_TEMPLATES[typeKey] || DEFAULT_EMAIL_TEMPLATES.CUSTOM;
        setSubject(interpolateTemplate(template.subject, variablesMap));
        setBody(interpolateTemplate(template.body, variablesMap));
        return;
      }
      const matched = activeTemplates.find((tpl) => tpl.id === value);
      if (matched) {
        setSubject(interpolateTemplate(matched.subject, variablesMap));
        setBody(interpolateTemplate(matched.body, variablesMap));
      }
    },
    [activeTemplates, variablesMap],
  );

  // Sync default template when modal opens or templates resolve asynchronously
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      hasManualSelectionRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setIsPreviewMode(false);
    }
    if (!hasManualSelectionRef.current) {
      setSelectedValue(resolvedDefaultValue);
      applyTemplateByValue(resolvedDefaultValue);
    }
  }, [isOpen, resolvedDefaultValue, applyTemplateByValue]);

  const handleSelectTemplate = (nextValue: string) => {
    hasManualSelectionRef.current = true;
    setSelectedValue(nextValue);
    applyTemplateByValue(nextValue);
  };

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
      const selectedTemplate = activeTemplates.find(
        (tpl) => tpl.id === selectedValue,
      );
      const templateType: EmailTemplateType = selectedTemplate
        ? selectedTemplate.type
        : selectedValue.startsWith(STATIC_TEMPLATE_PREFIX)
          ? (selectedValue.slice(
              STATIC_TEMPLATE_PREFIX.length,
            ) as EmailTemplateType)
          : "CUSTOM";
      const templateId = selectedTemplate ? selectedTemplate.id : undefined;
      const templateName = selectedTemplate
        ? selectedTemplate.name
        : selectedValue === ADHOC_TEMPLATE_VALUE
          ? t("email.customAdHocOption")
          : undefined;

      const log = await sendEmailMutation.mutateAsync({
        to: candidate.email,
        recipientName: candidateDisplayName,
        subject,
        body,
        ...(templateId ? { templateId } : {}),
        ...(templateName ? { templateName } : {}),
        templateType,
        candidateId: candidate.id,
      });

      toast.success(t("email.sendSuccessToast"));
      onSendSuccess?.(log);
      onClose();
    } catch (err) {
      console.error("Failed to send email:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const isSending = sendEmailMutation.isPending;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={isSending ? () => {} : onClose}
      title={t("email.modalTitle")}
      badge={
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          {candidateDisplayName}
        </span>
      }
      size="lg"
      contentClassName="flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-[#1a1a1a]"
    >
      {/* Subheader Candidate info strip */}
      <div className="px-6 py-2.5 border-b border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#202020] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-white">
            {candidateDisplayName}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500 dark:text-slate-400">
            {candidate.email}
          </span>
        </div>
      </div>

      {/* Modal Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Template Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {t("email.selectTemplate")}
          </label>
          <CustomSelect
            value={selectedValue}
            onChange={handleSelectTemplate}
            options={templateOptions}
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
              {candidateDisplayName}
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
            placeholder={t("email.subjectPlaceholder")}
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
              <span>{t("email.tabCompose")}</span>
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
              <span>{t("email.htmlAndVariables")}</span>
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
              placeholder={t("email.bodyPlaceholder")}
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
                    title={t(v.labelKey as TranslationKey) || v.label}
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
                <strong className="text-slate-700 dark:text-slate-300">
                  {t("email.thSubject")}:
                </strong>{" "}
                {subject}
              </div>
              <div>
                <strong className="text-slate-700 dark:text-slate-300">
                  {t("email.thRecipient")}:
                </strong>{" "}
                {candidateDisplayName} &lt;{candidate.email}&gt;
              </div>
            </div>
            <EmailHtmlPreview
              title={subject}
              body={body}
              className="prose prose-xs dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#202020] shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSending}
          className="h-8 px-3.5 text-xs font-semibold rounded-lg cursor-pointer shadow-2xs"
        >
          {t("email.cancel")}
        </Button>

        <Button
          type="button"
          onClick={handleSend}
          disabled={isSending || !subject.trim() || !body.trim()}
          className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs cursor-pointer inline-flex items-center gap-2"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isSending ? t("email.sendingBtn") : t("email.sendBtn")}</span>
        </Button>
      </div>
    </CustomModal>
  );
}
