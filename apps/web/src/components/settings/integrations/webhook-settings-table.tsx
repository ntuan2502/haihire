"use client";

import { SettingsButton } from "@/components/settings/settings-button";
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
    <div className="rounded-xl border border-border bg-card text-card-foreground overflow-hidden shadow-xs">
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
          <span>{t("common.loading")}</span>
        </div>
      ) : webhookSettings.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Webhook className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t("settings.integrations.webhooks.emptyState")}
          </p>
          {isAdmin && (
            <SettingsButton
              variant="outline"
              size="sm"
              onClick={onOpenAdd}
              icon={Plus}
              className="mt-2"
            >
              {t("settings.integrations.webhooks.addButton")}
            </SettingsButton>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th scope="col" className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.eventType")}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.provider")}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.status")}
                </th>
                <th scope="col" className="py-3 px-4">
                  {t("settings.integrations.webhooks.table.lastUpdated")}
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  {t("settings.integrations.webhooks.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {webhookSettings.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-foreground">
                    <div className="flex flex-col">
                      <span>
                        {t(
                          `settings.integrations.webhooks.eventTypes.${item.eventType}`,
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-xs mt-0.5">
                        {item.webhookUrl}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
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
                        className="border-border text-muted-foreground bg-muted/50 flex items-center gap-1 w-fit"
                      >
                        <PauseCircle className="h-3 w-3" />
                        {t("settings.integrations.webhooks.disabled")}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <SettingsButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onTest(item)}
                        title={t(
                          "settings.integrations.webhooks.modal.testButton",
                        )}
                        aria-label={t(
                          "settings.integrations.webhooks.modal.testButton",
                        )}
                        disabled={isTesting}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </SettingsButton>
                      {isAdmin && (
                        <>
                          <SettingsButton
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onOpenEdit(item)}
                            title={t("common.edit")}
                            aria-label={t("common.edit")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </SettingsButton>
                          <SettingsButton
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(item.id)}
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </SettingsButton>
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
