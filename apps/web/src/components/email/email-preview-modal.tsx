"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "cn";
import { EmailHtmlPreview } from "./email-html-preview";
import { useI18n } from "@/i18n";
import { formatDateTime } from "@/lib/utils";
import type { EmailDeliveryStatus } from "@/lib/email-templates";
import {
  PreviewModal,
  DevicePreviewFrame,
  DevicePreviewSelector,
  type PreviewDeviceType,
} from "@/components/shared";

export interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  senderName?: string;
  senderEmail?: string;
  candidateName?: string;
  candidateEmail?: string;
  templateName?: string;
  title?: ReactNode;
  badge?: ReactNode;
  status?: EmailDeliveryStatus;
  date?: string | Date;
  errorMessage?: string;
}

export function EmailPreviewModal({
  isOpen,
  onClose,
  subject,
  body,
  senderName,
  senderEmail,
  candidateName,
  candidateEmail,
  templateName,
  title,
  badge,
  status,
  date,
  errorMessage,
}: EmailPreviewModalProps) {
  const { t } = useI18n();
  const [previewDevice, setPreviewDevice] =
    useState<PreviewDeviceType>("desktop");
  const [fallbackDate] = useState(() => new Date());

  const handleClose = () => {
    setPreviewDevice("desktop");
    onClose();
  };

  const displaySenderName = senderName || t("email.defaultSenderName");
  const displaySenderEmail = senderEmail || "careers@haihire.vn";
  const displayCandidateName = candidateName || t("email.sampleCandidateName");
  const displayCandidateEmail = candidateEmail || "an.nguyen@example.com";

  const senderInitials =
    displaySenderName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "E";

  const displayDate = formatDateTime(date ?? fallbackDate);

  const modalTitle = title || templateName || subject || t("email.livePreview");

  const statusBadge = status ? (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs shrink-0",
        status === "SENT" &&
          "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800",
        status === "SIMULATED" &&
          "bg-secondary text-secondary-foreground border border-border",
        status === "FAILED" &&
          "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800",
      )}
    >
      {status === "SENT" && (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {status === "FAILED" && (
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>
        {status === "SENT"
          ? t("email.statusSent")
          : status === "SIMULATED"
            ? t("email.statusSimulated")
            : t("email.statusFailed")}
      </span>
    </span>
  ) : (
    badge || (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border">
        {t("email.livePreview")}
      </span>
    )
  );

  return (
    <PreviewModal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      badge={statusBadge}
      size="xl"
      height="h-[90dvh]"
      allowMaximize={true}
      headerActions={
        <DevicePreviewSelector
          device={previewDevice}
          onChange={setPreviewDevice}
        />
      }
    >
      {({ isMaximized }) => (
        <DevicePreviewFrame device={previewDevice} isMaximized={isMaximized}>
          {previewDevice === "mobile" ? (
            /* Mobile Mail Layout */
            <div
              key="email-preview-mobile"
              className="flex-1 flex flex-col bg-card text-card-foreground"
            >
              <div className="px-4 py-2 border-b border-border flex items-center justify-between mt-1">
                <span className="text-xs font-semibold text-foreground">
                  {t("email.mobileBackToInbox")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {displayDate.split(",")[0]}
                </span>
              </div>

              <div className="p-4 border-b border-border space-y-1">
                <h2 className="text-sm font-semibold text-foreground leading-tight">
                  {subject}
                </h2>
                <div className="text-[11px] text-muted-foreground">
                  <strong>{displaySenderName}</strong>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {t("email.toLabel")}: {displayCandidateName}
                </div>
              </div>

              {/* Error banner if delivery failed */}
              {(status === "FAILED" || errorMessage) && (
                <div className="mx-4 mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2.5 shrink-0 shadow-xs">
                  <AlertCircle
                    className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-bold text-xs text-rose-700 dark:text-rose-300">
                      {t("email.statusFailed")}
                    </div>
                    <div className="text-[11px] text-rose-600/90 dark:text-rose-300/90 leading-relaxed font-mono break-words break-all [overflow-wrap:anywhere] bg-rose-100/50 dark:bg-rose-900/30 p-2 rounded-lg border border-rose-200/60 dark:border-rose-800/60 max-h-32 overflow-y-auto">
                      {errorMessage || t("email.deliveryFailedDesc")}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto">
                <EmailHtmlPreview
                  title={subject}
                  body={body}
                  className="text-xs leading-relaxed text-foreground"
                />
              </div>
            </div>
          ) : (
            /* Desktop / Tablet Mail Layout */
            <div
              key={`email-preview-${previewDevice}`}
              className="flex-1 overflow-y-auto flex flex-col bg-card text-card-foreground"
            >
              <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight leading-snug">
                  {subject}
                </h1>

                <div className="flex items-start justify-between gap-4 mt-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-xs shrink-0">
                      {senderInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {displaySenderName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          {`<${displaySenderEmail}>`}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        <span className="text-muted-foreground">
                          {t("email.toLabel")}:
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {displayCandidateName}
                        </span>{" "}
                        <span className="text-muted-foreground text-[11px]">
                          {`<${displayCandidateEmail}>`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Meta: Timestamp */}
                  <div className="flex flex-col items-end shrink-0 whitespace-nowrap">
                    <div className="text-[11px] text-muted-foreground">
                      {displayDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error banner if delivery failed */}
              {(status === "FAILED" || errorMessage) && (
                <div className="mx-6 sm:mx-8 mt-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-3 shrink-0 shadow-xs">
                  <AlertCircle
                    className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="font-bold text-sm text-rose-700 dark:text-rose-300">
                      {t("email.statusFailed")}
                    </div>
                    <div className="text-xs text-rose-600/90 dark:text-rose-300/90 leading-relaxed font-mono break-words break-all [overflow-wrap:anywhere] bg-rose-100/50 dark:bg-rose-900/30 p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-800/60 max-h-40 overflow-y-auto">
                      {errorMessage || t("email.deliveryFailedDesc")}
                    </div>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "flex-1 p-6 sm:p-10 w-full",
                  previewDevice === "tablet" ? "max-w-3xl mx-auto" : "",
                )}
              >
                <EmailHtmlPreview
                  title={subject}
                  body={body}
                  className="text-[13px] leading-relaxed text-foreground font-sans"
                />
              </div>
            </div>
          )}
        </DevicePreviewFrame>
      )}
    </PreviewModal>
  );
}
