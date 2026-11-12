"use client";

import { useI18n } from "@/i18n";
import type { WebhookSettingResponse } from "@haihire/shared";
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Webhook,
  CheckCircle2,
  PauseCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface WebhookSettingsTableProps {
  webhookSettings: WebhookSettingResponse[];
  isLoading: boolean;
  isAdmin: boolean;
  onOpenAdd: () => void;
  onOpenEdit: (setting: WebhookSettingResponse) => void;
  onDelete: (id: string) => void;
  onTest: (setting: WebhookSettingResponse) => void;
  isTesting: boolean;
}

export function WebhookSettingsTable({
  webhookSettings,
  isLoading,
  isAdmin,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onTest,
  isTesting,
}: WebhookSettingsTableProps) {
  const { t, locale } = useI18n();

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>{t("common.loading")}</span>
        </div>
      ) : webhookSettings.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Webhook className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t("settings.integrations.webhooks.emptyState")}
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAdd}
              className="mt-2 h-9 px-3.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t("settings.integrations.webhooks.addButton")}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.eventType")}
                </th>
                <th className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.provider")}
                </th>
                <th className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.status")}
                </th>
                <th className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.lastUpdated")}
                </th>
                <th className="py-3 px-4 text-right">
                  {t("settings.integrations.webhooks.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {webhookSettings.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex flex-col">
                      <span>
                        {t(
                          `settings.integrations.webhooks.eventTypes.${item.eventType}`,
                        )}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs mt-0.5">
                        {item.webhookUrl}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {t(
                        `settings.integrations.webhooks.providers.${item.provider}`,
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.isEnabled ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1 w-fit"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t("settings.integrations.webhooks.enabled")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1 w-fit"
                      >
                        <PauseCircle className="h-3 w-3" />
                        {t("settings.integrations.webhooks.disabled")}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onTest(item)}
                        title={t(
                          "settings.integrations.webhooks.modal.testButton",
                        )}
                        disabled={isTesting}
                        className="h-8 w-8 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenEdit(item)}
                            title={t("common.edit")}
                            className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item.id)}
                            title={t("common.delete")}
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
