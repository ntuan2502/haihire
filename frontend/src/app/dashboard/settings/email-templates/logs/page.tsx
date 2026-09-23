"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  type EmailLog,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const { data: remoteLogsResponse } = useEmailLogs({
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("email.outboxTitle")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("email.outboxDesc")}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder={t("email.searchRecipient")}
              className="h-8 pl-8 text-xs"
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
            className="w-36"
            triggerClassName="h-8 text-xs"
          />
        </div>
      </div>

      {/* Outbox Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{t("email.thSentAt")}</th>
                <th className="px-4 py-3">{t("email.thRecipient")}</th>
                <th className="px-4 py-3">{t("email.thTemplate")}</th>
                <th className="px-4 py-3">{t("email.thSubject")}</th>
                <th className="px-4 py-3">{t("email.thStatus")}</th>
                <th className="px-4 py-3 text-right">{t("email.thActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {t("email.noLogsFound")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateStr = new Date(log.sentAt).toLocaleString("vi-VN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.candidateName || log.recipientName || "—"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {log.candidateEmail || log.recipientEmail || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {log.templateType}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-700 dark:text-slate-300 font-medium">
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingLog(log)}
                          className="h-7 px-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                        >
                          {t("email.viewDetails")}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Outbox Pagination Bar */}
        {totalLogs > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
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
      </div>

      {/* Log Detail Modal using shared EmailPreviewModal */}
      {viewingLog && (
        <EmailPreviewModal
          isOpen={!!viewingLog}
          onClose={() => setViewingLog(null)}
          subject={viewingLog.subject}
          body={viewingLog.body}
          senderName={viewingLog.senderName}
          senderEmail={viewingLog.senderEmail}
          candidateName={viewingLog.candidateName || viewingLog.recipientName || undefined}
          candidateEmail={viewingLog.candidateEmail || viewingLog.recipientEmail || undefined}
          templateName={viewingLog.templateType}
          status={viewingLog.status}
          date={viewingLog.sentAt}
          errorMessage={viewingLog.errorMessage}
        />
      )}
    </div>
  );
}
