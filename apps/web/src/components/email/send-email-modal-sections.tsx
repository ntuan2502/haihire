"use client";

import { User, Briefcase } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { TEMPLATE_VARIABLES, interpolateTemplate } from "@/lib/email-templates";
import { EmailHtmlPreview } from "./email-html-preview";

interface SendEmailRecipientBannerProps {
  candidateDisplayName: string;
  normalizedEmail: string;
  hasEmail: boolean;
  effectiveJobTitle: string;
}

/**
 * Displays candidate recipient metadata and job context inside SendEmailModal.
 */
export function SendEmailRecipientBanner({
  candidateDisplayName,
  normalizedEmail,
  hasEmail,
  effectiveJobTitle,
}: SendEmailRecipientBannerProps) {
  const { t } = useI18n();

  return (
    <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-muted-foreground flex-wrap min-w-0">
        <User
          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <span>{t("email.recipient")}:</span>
        <strong className="font-semibold text-foreground">
          {candidateDisplayName}
        </strong>
        {hasEmail && (
          <span className="text-muted-foreground break-all">
            {normalizedEmail}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
        <Briefcase
          className="h-3 w-3 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <span className="truncate">{effectiveJobTitle}</span>
      </div>
    </div>
  );
}

interface SendEmailVariableBarProps {
  isSending: boolean;
  onInsertVariable: (varKey: string) => void;
}

/**
 * Renders clickable placeholder variable pills for email composition.
 */
export function SendEmailVariableBar({
  isSending,
  onInsertVariable,
}: SendEmailVariableBarProps) {
  const { t } = useI18n();

  return (
    <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
      <div className="text-[11px] font-medium text-muted-foreground">
        {t("email.insertVariableHint")}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            disabled={isSending}
            onClick={() => onInsertVariable(v.key)}
            className="px-2 py-0.5 rounded-md bg-background border border-input text-[11px] font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              (v.labelKey ? t(v.labelKey as TranslationKey) : "") || v.label
            }
          >
            {v.key}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SendEmailPreviewPaneProps {
  subject: string;
  body: string;
  variablesMap: Record<string, string | undefined>;
  candidateDisplayName: string;
  normalizedEmail: string;
  hasEmail: boolean;
}

/**
 * Renders interpolated email subject, recipient, and sanitized HTML preview.
 */
export function SendEmailPreviewPane({
  subject,
  body,
  variablesMap,
  candidateDisplayName,
  normalizedEmail,
  hasEmail,
}: SendEmailPreviewPaneProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-3.5 sm:p-6 shadow-xs space-y-4">
      <div className="border-b border-border pb-3 text-xs space-y-1 text-muted-foreground">
        <div className="break-words">
          <strong className="text-foreground">{t("email.thSubject")}:</strong>{" "}
          {interpolateTemplate(subject, variablesMap)}
        </div>
        <div className="break-words">
          <strong className="text-foreground">{t("email.thRecipient")}:</strong>{" "}
          {candidateDisplayName}{" "}
          {hasEmail && (
            <span className="break-all">{`<${normalizedEmail}>`}</span>
          )}
        </div>
      </div>
      <EmailHtmlPreview
        title={interpolateTemplate(subject, variablesMap)}
        body={interpolateTemplate(body, variablesMap)}
        className="prose prose-xs dark:prose-invert max-w-none text-xs text-foreground leading-relaxed"
      />
    </div>
  );
}
