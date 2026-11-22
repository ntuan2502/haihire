"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useId,
  type FormEvent,
} from "react";
import { Send, Eye, Edit3 } from "lucide-react";
import {
  type EmailFlowKey,
  type EmailTemplateType,
  type EmailLog,
  DEFAULT_EMAIL_TEMPLATES,
  getEmailTemplateTypeLabel,
  interpolateTemplate,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect, FormModal } from "@/components/shared";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatDate,
  formatTime,
  getCandidateDisplayName,
  normalizeEmailAddress,
} from "@/lib/utils";
import {
  SendEmailPreviewPane,
  SendEmailRecipientBanner,
  SendEmailVariableBar,
} from "./send-email-modal-sections";
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
  const baseId = useId();
  const templateSelectId = `${baseId}-template`;
  const subjectInputId = `${baseId}-subject`;
  const canViewEmail = useHasPermission("email:view");

  const candidateDisplayName = candidate
    ? getCandidateDisplayName(candidate)
    : "";
  const normalizedEmail = normalizeEmailAddress(candidate?.email);
  const hasEmail = normalizedEmail.length > 0;
  const effectiveJobTitle = jobTitle || t("email.defaultJobTitle");
  const effectiveOrgName = organizationName || t("email.defaultOrgName");

  const interviewScheduledAt = interviewDetails?.scheduledAt;
  const interviewFormat = interviewDetails?.format;
  const interviewLinkOrLocation = interviewDetails?.linkOrLocation;
  const interviewInterviewer = interviewDetails?.interviewer;

  const { data: remoteTemplates } = useEmailTemplates(undefined, {
    enabled: isOpen,
  });
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
          label: t("email.customAdHocOption"),
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
        label: t("email.customAdHocOption"),
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
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpenRef = useRef(false);
  const hasManualEditRef = useRef(false);
  const appliedDefaultRef = useRef<string | null>(null);

  // Variables map with primitive dependencies so parent object literals never re-trigger composer resets
  const candidatePhone = candidate?.phone;
  const variablesMap = useMemo(() => {
    return {
      candidate_name: candidateDisplayName || t("email.defaultCandidateName"),
      candidate_email: normalizedEmail || undefined,
      candidate_phone: candidatePhone || undefined,
      job_title: effectiveJobTitle,
      company_name: effectiveOrgName,
      interview_date: interviewScheduledAt
        ? formatDate(interviewScheduledAt)
        : undefined,
      interview_time: interviewScheduledAt
        ? formatTime(interviewScheduledAt)
        : undefined,
      interview_format: interviewFormat || undefined,
      interview_link: interviewLinkOrLocation || undefined,
      interviewer_name: interviewInterviewer || undefined,
      sender_name: t("email.defaultSenderName"),
    };
  }, [
    candidateDisplayName,
    normalizedEmail,
    candidatePhone,
    effectiveJobTitle,
    effectiveOrgName,
    interviewScheduledAt,
    interviewFormat,
    interviewLinkOrLocation,
    interviewInterviewer,
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

  // Sync default template when modal opens or async default resolves, preserving manual edits
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      hasManualEditRef.current = false;
      appliedDefaultRef.current = null;
      return;
    }
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setIsPreviewMode(false);
    }
    if (
      !hasManualEditRef.current &&
      appliedDefaultRef.current !== resolvedDefaultValue
    ) {
      appliedDefaultRef.current = resolvedDefaultValue;
      setSelectedValue(resolvedDefaultValue);
      applyTemplateByValue(resolvedDefaultValue);
    }
  }, [isOpen, resolvedDefaultValue, applyTemplateByValue]);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const handleSelectTemplate = (nextValue: string) => {
    hasManualEditRef.current = true;
    setSelectedValue(nextValue);
    applyTemplateByValue(nextValue);
  };

  if (!candidate) return null;

  const isSending = sendEmailMutation.isPending;

  const handleInsertVariable = (varKey: string) => {
    if (isSending) return;
    hasManualEditRef.current = true;
    if (!bodyInputRef.current) {
      setBody((prev) => prev + " " + varKey);
      return;
    }
    const textarea = bodyInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = body.substring(0, start) + varKey + body.substring(end);
    setBody(nextBody);
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (isSending || !hasEmail || !subject.trim() || !body.trim()) return;
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

      const definedVariables: Record<string, string> = {};
      for (const [key, val] of Object.entries(variablesMap)) {
        if (val !== undefined) {
          definedVariables[key] = val;
        }
      }

      const log = await sendEmailMutation.mutateAsync({
        to: normalizedEmail,
        recipientName: candidateDisplayName,
        subject: interpolateTemplate(subject, variablesMap),
        body: interpolateTemplate(body, variablesMap),
        ...(Object.keys(definedVariables).length > 0
          ? { variables: definedVariables }
          : {}),
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

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSend}
      title={t("email.modalTitle")}
      icon={
        <Send className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
      }
      badge={
        <span className="text-[11px] font-semibold text-foreground">
          {candidateDisplayName}
        </span>
      }
      size="lg"
      isSubmitting={isSending}
      submitDisabled={!subject.trim() || !body.trim() || !hasEmail}
      submitLabel={t("email.sendBtn")}
      savingLabel={t("email.sendingBtn")}
      cancelLabel={t("email.cancel")}
      bodyClassName="space-y-4 bg-background"
    >
      {/* Template Selector */}
      <div>
        <label
          htmlFor={`${templateSelectId}-trigger`}
          className="block text-xs font-medium text-foreground mb-1.5"
        >
          {t("email.selectTemplate")}
        </label>
        <CustomSelect
          id={templateSelectId}
          value={selectedValue}
          onChange={handleSelectTemplate}
          options={templateOptions}
          disabled={isSending}
          className="w-full"
          triggerClassName="h-9 text-xs"
        />
      </div>

      {/* Recipient Information Pill */}
      <SendEmailRecipientBanner
        candidateDisplayName={candidateDisplayName}
        normalizedEmail={normalizedEmail}
        hasEmail={hasEmail}
        effectiveJobTitle={effectiveJobTitle}
      />

      {/* Subject Field */}
      <div>
        <label
          htmlFor={subjectInputId}
          className="block text-xs font-medium text-foreground mb-1.5"
        >
          {t("email.subject")}
        </label>
        <Input
          id={subjectInputId}
          value={subject}
          disabled={isSending}
          onChange={(e) => {
            hasManualEditRef.current = true;
            setSubject(e.target.value);
          }}
          placeholder={t("email.subjectPlaceholder")}
          className="h-9 text-xs"
        />
      </div>

      {/* Edit / Preview Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-1 p-0.5 bg-muted border border-border rounded-lg">
          <button
            type="button"
            disabled={isSending}
            onClick={() => setIsPreviewMode(false)}
            className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              !isPreviewMode
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <Edit3 className="h-3 w-3" aria-hidden="true" />
            <span>{t("email.tabCompose")}</span>
          </button>
          <button
            type="button"
            disabled={isSending}
            onClick={() => setIsPreviewMode(true)}
            className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              isPreviewMode
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            <span>{t("email.livePreview")}</span>
          </button>
        </div>

        {!isPreviewMode && (
          <span className="text-[11px] text-muted-foreground">
            {t("email.htmlAndVariables")}
          </span>
        )}
      </div>

      {/* Body Editor or Preview Mode */}
      {!isPreviewMode ? (
        <div className="space-y-2">
          <Textarea
            ref={bodyInputRef}
            value={body}
            disabled={isSending}
            onChange={(e) => {
              hasManualEditRef.current = true;
              setBody(e.target.value);
            }}
            rows={10}
            className="p-3.5 text-xs font-mono leading-relaxed shadow-2xs"
            placeholder={t("email.bodyPlaceholder")}
          />

          <SendEmailVariableBar
            isSending={isSending}
            onInsertVariable={handleInsertVariable}
          />
        </div>
      ) : (
        <SendEmailPreviewPane
          subject={subject}
          body={body}
          variablesMap={variablesMap}
          candidateDisplayName={candidateDisplayName}
          normalizedEmail={normalizedEmail}
          hasEmail={hasEmail}
        />
      )}
    </FormModal>
  );
}
