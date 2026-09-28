"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "cn";
import { useI18n } from "@/i18n";
import type { EmailDeliveryStatus } from "@/lib/email-templates";
import {
  MacOsModal,
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
  const [previewDevice, setPreviewDevice] = useState<PreviewDeviceType>("desktop");

  const displaySenderName = senderName || t("email.defaultSenderName");
  const displaySenderEmail = senderEmail || "careers@nexus.com";
  const displayCandidateName = candidateName || t("email.sampleCandidateName");
  const displayCandidateEmail = candidateEmail || "an.nguyen@example.com";

  // Initials for sender avatar
  const senderInitials =
    displaySenderName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "E";

  const displayDate = date
    ? new Date(date).toLocaleString("vi-VN", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const modalTitle = title || templateName || subject || t("email.livePreview");

  // Prominent status badge with icon and matching colors
  const statusBadge = status ? (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs shrink-0",
        status === "SENT" &&
          "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800",
        status === "SIMULATED" &&
          "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800",
        status === "FAILED" &&
          "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800"
      )}
    >
      {status === "SENT" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "FAILED" && <AlertCircle className="h-3.5 w-3.5" />}
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
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/10 text-blue-600 dark:text-blue-400">
        {t("email.livePreview")}
      </span>
    )
  );

  return (
    <MacOsModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      badge={statusBadge}
      maxWidth="max-w-6xl"
      height="h-[90vh]"
      headerRight={
        <DevicePreviewSelector
          device={previewDevice}
          onChange={setPreviewDevice}
        />
      }
    >
      {({ isMaximized }) => (
        <DevicePreviewFrame
          device={previewDevice}
          isMaximized={isMaximized}
          url={`mail.nexus.com/messages/${templateName ? encodeURIComponent(templateName.toLowerCase().replace(/\s+/g, "-")) : "inbox"}`}
        >
          {previewDevice === "mobile" ? (
            /* iOS Mail Layout */
            <div key="email-preview-mobile" className="flex-1 flex flex-col bg-white dark:bg-[#1c1c1e]">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mt-1">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  ‹ Inbox
                </span>
                <div className="flex items-center gap-2">
                  {status && statusBadge}
                  <span className="text-[10px] text-slate-400">
                    {displayDate.split(",")[0]}
                  </span>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {subject}
                </h2>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <strong>{displaySenderName}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  {t("email.toLabel")}: {displayCandidateName}
                </div>
              </div>

              {/* Error banner if delivery failed */}
              {(status === "FAILED" || errorMessage) && (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2.5 shrink-0 shadow-2xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-bold text-xs text-rose-700 dark:text-rose-300">
                      {t("email.statusFailed")}
                    </div>
                    <div className="text-[11px] text-rose-600/90 dark:text-rose-300/90 leading-relaxed font-mono break-words break-all [overflow-wrap:anywhere] bg-rose-100/50 dark:bg-rose-900/30 p-2 rounded-lg border border-rose-200/60 dark:border-rose-800/60 max-h-32 overflow-y-auto">
                      {errorMessage || t("email.deliveryFailedDesc") || "Không thể gửi thư hoặc bị máy chủ từ chối."}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto">
                <div
                  className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 space-y-3"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              </div>
            </div>
          ) : (
            /* Desktop / Tablet Apple Mail Layout */
            <div key={`email-preview-${previewDevice}`} className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-[#1e1e1e]">
              <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800/90">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                  {subject}
                </h1>

                <div className="flex items-start justify-between gap-4 mt-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                      {senderInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {displaySenderName}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                          &lt;{displaySenderEmail}&gt;
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="text-slate-400 dark:text-slate-500">{t("email.toLabel")}:</span>{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {displayCandidateName}
                        </span>{" "}
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                          &lt;{displayCandidateEmail}&gt;
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Meta: Status Badge & Timestamp */}
                  <div className="flex flex-col items-end shrink-0 whitespace-nowrap">
                    {status && (
                      <div className="mb-1.5">
                        {statusBadge}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {displayDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error banner if delivery failed */}
              {(status === "FAILED" || errorMessage) && (
                <div className="mx-6 sm:mx-8 mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-3 shrink-0 shadow-2xs">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
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

              <div className={cn("flex-1 p-6 sm:p-10 w-full", previewDevice === "tablet" ? "max-w-3xl mx-auto" : "")}>
                <div
                  className={cn(
                    "text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 space-y-4 font-sans",
                    previewDevice === "desktop" && "[&>div]:!max-w-none [&>div]:!w-full"
                  )}
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              </div>
            </div>
          )}
        </DevicePreviewFrame>
      )}
    </MacOsModal>
  );
}
