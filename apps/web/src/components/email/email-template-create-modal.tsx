"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MailPlus, Sparkles } from "lucide-react";
import { CustomSelect, FormModal } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n, type TranslationKey } from "@/i18n";
import {
  DEFAULT_EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  getEmailTemplateTypeOptions,
  type EmailTemplateType,
} from "@/lib/email-templates";

export interface EmailTemplateCreatePayload {
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  enabled: boolean;
}

export interface EmailTemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EmailTemplateCreatePayload) => Promise<void>;
  isSubmitting?: boolean;
}

export function EmailTemplateCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EmailTemplateCreateModalProps) {
  const { t } = useI18n();
  const enabledId = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<EmailTemplateType>("CUSTOM");
  const [subject, setSubject] = useState(
    DEFAULT_EMAIL_TEMPLATES.CUSTOM.subject,
  );
  const [body, setBody] = useState(DEFAULT_EMAIL_TEMPLATES.CUSTOM.body);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setType("CUSTOM");
      setSubject(DEFAULT_EMAIL_TEMPLATES.CUSTOM.subject);
      setBody(DEFAULT_EMAIL_TEMPLATES.CUSTOM.body);
      setEnabled(true);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const handleInsertVariable = (varKey: string) => {
    if (isSubmitting) return;
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((prev) => `${prev} ${varKey}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setBody(body.substring(0, start) + varKey + body.substring(end));
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim() || isSubmitting) return;
    await onSubmit({
      name: name.trim(),
      type,
      subject: subject.trim(),
      body,
      enabled,
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t("email.createModalTitle")}
      icon={
        <MailPlus
          className="h-4 w-4 text-foreground shrink-0"
          aria-hidden="true"
        />
      }
      size="md"
      isSubmitting={isSubmitting}
      submitDisabled={!name.trim() || !subject.trim() || !body.trim()}
      submitLabel={t("email.newTemplateBtn")}
      cancelLabel={t("common.cancel")}
      bodyClassName="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label
            htmlFor="new-template-name"
            className="block text-xs font-medium text-foreground"
          >
            {t("email.templateTitleLabel")}
          </label>
          <Input
            id="new-template-name"
            value={name}
            disabled={isSubmitting}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("email.templateTitlePlaceholder")}
            className="h-9 text-xs"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="new-template-category-trigger"
            className="block text-xs font-medium text-foreground"
          >
            {t("email.templateCategoryLabel")}
          </label>
          <CustomSelect
            id="new-template-category"
            size="sm"
            value={type}
            disabled={isSubmitting}
            onChange={(val) => setType(val as EmailTemplateType)}
            options={getEmailTemplateTypeOptions(t)}
            className="w-full"
            triggerClassName="h-9 text-xs"
          />
        </div>
      </div>

      <label
        htmlFor={enabledId}
        className="flex items-center gap-2.5 cursor-pointer select-none"
      >
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          disabled={isSubmitting}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary focus-visible:ring-ring cursor-pointer disabled:opacity-50"
        />
        <span className="text-xs font-medium text-foreground">
          {t("email.templateEnabledLabel")}
        </span>
      </label>

      <div className="space-y-1.5">
        <label
          htmlFor="new-template-subject"
          className="block text-xs font-medium text-foreground"
        >
          {t("email.subject")}
        </label>
        <Input
          id="new-template-subject"
          value={subject}
          disabled={isSubmitting}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("email.subjectPlaceholder")}
          className="h-9 text-xs"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="new-template-body"
          className="block text-xs font-medium text-foreground"
        >
          {t("email.body")}
        </label>
        <Textarea
          id="new-template-body"
          ref={bodyRef}
          value={body}
          disabled={isSubmitting}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder={t("email.bodyPlaceholder")}
          className="p-3 text-xs font-mono leading-relaxed"
        />
      </div>

      <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Sparkles
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <span>{t("email.insertVariableHint")}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleInsertVariable(v.key)}
              className="px-2 py-1 rounded-md bg-background border border-border text-[11px] font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={t(v.labelKey as TranslationKey) || v.label}
            >
              {v.key}
            </button>
          ))}
        </div>
      </div>
    </FormModal>
  );
}
