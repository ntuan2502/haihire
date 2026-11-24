"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsLogTable } from "@/components/settings/settings-log-table";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Search } from "lucide-react";
import {
  getEmailTemplateTypeLabel,
  type EmailLog,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { formatDateTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared";
import { CustomSelect } from "@/components/shared/custom-select";
import { Pagination } from "@/components/shared/pagination";
import { EmailPreviewModal } from "@/components/email/email-preview-modal";
import { useEmailLogs } from "@/hooks/use-queries";

export default function EmailLogsPage() {
  const { t } = useI18n();

  // Outbox / logs pagination & filtering state
  const [logPage, setLogPage] = useState(1);
  const [logLimit, setLogLimit] = useState(20);
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("ALL");
  const [viewingLog, setViewingLog] = useState<EmailLog | null>(null);

  const { data: remoteLogsResponse, isLoading: logsLoading } = useEmailLogs({
    page: logPage,
    limit: logLimit,
    search: logSearch.trim() || undefined,
    status: logStatusFilter !== "ALL" ? logStatusFilter : undefined,
  });

  const logs = remoteLogsResponse?.data || [];
  const totalLogs = remoteLogsResponse?.total || 0;
  const totalPages = remoteLogsResponse?.totalPages || 1;

  useEffect(() => {
    setLogPage(1);
  }, [logSearch, logStatusFilter]);

  if (logsLoading && logs.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("email.outboxTitle")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("email.outboxDesc")}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              name="email-logs-search"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder={t("email.searchRecipient")}
              aria-label={t("email.searchRecipient")}
              className="h-8 pl-8 text-xs w-full"
            />
          </div>

          <CustomSelect
            value={logStatusFilter}
            onChange={(val) => setLogStatusFilter(val)}
            options={[
              { value: "ALL", label: t("email.allStatuses") },
              { value: "SENT", label: t("email.statusSent") },
              { value: "SIMULATED", label: t("email.statusSimulated") },
              { value: "FAILED", label: t("email.statusFailed") },
            ]}
            className="w-full sm:w-36"
            triggerClassName="h-8 text-xs w-full"
          />
        </div>
      </div>

      {/* Outbox Table */}
      <SettingsLogTable
        footer={
          <>
            {/* Outbox Pagination Bar */}
            {totalLogs > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/30">
                <Pagination
                  currentPage={logPage}
                  totalPages={totalPages}
                  totalItems={totalLogs}
                  pageSize={logLimit}
                  pageSizeOptions={[10, 20, 50, 100]}
                  onPageChange={(p) => setLogPage(p)}
                  onPageSizeChange={(size) => {
                    setLogLimit(size);
                    setLogPage(1);
                  }}
                  itemLabel={t("email.tabLogs").toLowerCase()}
                />
              </div>
            )}
          </>
        }
      >
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t("email.thSentAt")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("email.thRecipient")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("email.thTemplate")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("email.thSubject")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("common.status")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logsLoading ? (
              <tr>
                <td colSpan={6}>
                  <LoadingSpinner />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("email.noLogsFound")}
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const dateStr = formatDateTime(log.sentAt);

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {log.candidateName || log.recipientName || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {log.candidateEmail || log.recipientEmail || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border">
                        {log.templateName ||
                          getEmailTemplateTypeLabel(log.templateType, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs min-w-40 wrap-anywhere text-foreground font-medium">
                      {log.subject}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.status === "SENT" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{t("email.statusSent")}</span>
                        </span>
                      )}
                      {log.status === "SIMULATED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border">
                          <span>{t("email.statusSimulated")}</span>
                        </span>
                      )}
                      {log.status === "FAILED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300">
                          <AlertCircle className="h-3 w-3" />
                          <span>{t("email.statusFailed")}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SettingsButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingLog(log)}
                        className="h-7 px-2 text-[11px] font-medium text-foreground cursor-pointer"
                      >
                        {t("email.viewDetails")}
                      </SettingsButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </SettingsLogTable>

      {/* Log Detail Modal using shared EmailPreviewModal */}
      {viewingLog && (
        <EmailPreviewModal
          isOpen={!!viewingLog}
          onClose={() => setViewingLog(null)}
          subject={viewingLog.subject}
          body={viewingLog.body}
          senderName={viewingLog.senderName}
          senderEmail={viewingLog.senderEmail}
          candidateName={
            viewingLog.candidateName || viewingLog.recipientName || undefined
          }
          candidateEmail={
            viewingLog.candidateEmail || viewingLog.recipientEmail || undefined
          }
          templateName={
            viewingLog.templateName ||
            getEmailTemplateTypeLabel(viewingLog.templateType, t)
          }
          status={viewingLog.status}
          date={viewingLog.sentAt}
          errorMessage={viewingLog.errorMessage}
        />
      )}
    </div>
  );
}
