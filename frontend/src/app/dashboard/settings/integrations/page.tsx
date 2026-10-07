"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/context/auth-context";
import {
  useWebhookSettingsQuery,
  useCreateWebhookSettingMutation,
  useUpdateWebhookSettingMutation,
  useDeleteWebhookSettingMutation,
  useTestWebhookSettingMutation,
} from "@/hooks/use-webhook-setting-queries";
import type {
  WebhookSettingResponse,
  WebhookEventType,
  WebhookProviderType,
} from "@haihire/shared";
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Webhook,
  ShieldAlert,
  CheckCircle2,
  PauseCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "cn";

export default function IntegrationsSettingsPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { data: webhookSettings = [], isLoading } = useWebhookSettingsQuery();
  const createMutation = useCreateWebhookSettingMutation();
  const updateMutation = useUpdateWebhookSettingMutation();
  const deleteMutation = useDeleteWebhookSettingMutation();
  const testMutation = useTestWebhookSettingMutation();

  const [activeTab, setActiveTab] = useState<"webhooks">("webhooks");

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<WebhookEventType>("DLQ_ALERT");
  const [provider, setProvider] = useState<WebhookProviderType>("TELEGRAM");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretToken, setSecretToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  // Delete dialog state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setEventType("DLQ_ALERT");
    setProvider("TELEGRAM");
    setWebhookUrl("");
    setSecretToken("");
    setChatId("");
    setIsEnabled(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (setting: WebhookSettingResponse) => {
    setEditingId(setting.id);
    setEventType(setting.eventType);
    setProvider(setting.provider);
    setWebhookUrl(setting.webhookUrl);
    setSecretToken(setting.secretToken || "");
    setChatId(setting.chatId || "");
    setIsEnabled(setting.isEnabled);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error(t("errors.VALIDATION_ERROR"));
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            eventType,
            provider,
            webhookUrl,
            secretToken: provider === "GENERIC" ? secretToken : undefined,
            chatId: provider === "TELEGRAM" ? chatId : undefined,
            isEnabled,
          },
        });
        toast.success(t("common.save"));
      } else {
        await createMutation.mutateAsync({
          eventType,
          provider,
          webhookUrl,
          secretToken: provider === "GENERIC" ? secretToken : undefined,
          chatId: provider === "TELEGRAM" ? chatId : undefined,
          isEnabled,
        });
        toast.success(t("common.save"));
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errors.GENERIC_ERROR");
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success(t("common.delete"));
      setDeletingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errors.GENERIC_ERROR");
      toast.error(msg);
    }
  };

  const handleTestModal = async () => {
    try {
      if (editingId && (!webhookUrl || webhookUrl.includes("***"))) {
        await testMutation.mutateAsync({
          id: editingId,
        });
      } else {
        await testMutation.mutateAsync({
          eventType,
          provider,
          webhookUrl,
          secretToken: provider === "GENERIC" ? secretToken : undefined,
          chatId: provider === "TELEGRAM" ? chatId : undefined,
        });
      }
      toast.success(t("settings.integrations.webhooks.modal.testSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("settings.integrations.webhooks.modal.testFailed");
      toast.error(msg);
    }
  };

  const handleTestRow = async (setting: WebhookSettingResponse) => {
    try {
      await testMutation.mutateAsync({
        id: setting.id,
      });
      toast.success(t("settings.integrations.webhooks.modal.testSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("settings.integrations.webhooks.modal.testFailed");
      toast.error(msg);
    }
  };

  const getDynamicPlaceholder = (p: WebhookProviderType) => {
    switch (p) {
      case "TELEGRAM":
        return "https://api.telegram.org/bot<token>/sendMessage";
      case "DISCORD":
        return "https://discord.com/api/webhooks/<id>/<token>";
      case "GENERIC":
        return "https://example.com/api/webhooks";
    }
  };

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
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Webhook className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          {t("settings.integrations.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("settings.integrations.description")}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={cn(
            "pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === "webhooks"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {t("settings.integrations.tabs.webhooks")}
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {!isAdmin && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {t("settings.integrations.webhooks.adminOnly")}
                  </span>
                )}
              </p>
            </div>

            {isAdmin && (
              <Button
                id="add-webhook-btn"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{t("settings.integrations.webhooks.addButton")}</span>
              </Button>
            )}
          </div>

          {/* Webhooks Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t("common.loading")}</span>
              </div>
            ) : webhookSettings.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <Webhook className="h-6 w-6" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {t("settings.integrations.webhooks.emptyState")}
                </p>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAdd}
                    className="mt-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t("settings.integrations.webhooks.addButton")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">
                        {t("settings.integrations.webhooks.table.eventType")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("settings.integrations.webhooks.table.provider")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("settings.integrations.webhooks.table.status")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("settings.integrations.webhooks.table.lastUpdated")}
                      </th>
                      <th className="py-3.5 px-4 text-right">
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
                              {t(`settings.integrations.webhooks.eventTypes.${item.eventType}`)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs mt-0.5">
                              {item.webhookUrl}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {t(`settings.integrations.webhooks.providers.${item.provider}`)}
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
                              onClick={() => handleTestRow(item)}
                              title={t("settings.integrations.webhooks.modal.testButton")}
                              disabled={testMutation.isPending}
                              className="h-8 w-8 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(item)}
                                  title={t("common.edit")}
                                  className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingId(item.id)}
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
        </div>
      )}

      {/* Add / Edit Webhook Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("settings.integrations.webhooks.modal.editTitle")
                : t("settings.integrations.webhooks.modal.addTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Event Type Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("settings.integrations.webhooks.modal.eventType")}
              </label>
              <Select
                value={eventType}
                onValueChange={(val) => setEventType(val as WebhookEventType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DLQ_ALERT">
                    {t("settings.integrations.webhooks.eventTypes.DLQ_ALERT")}
                  </SelectItem>
                  <SelectItem value="ORPHAN_SPIKE">
                    {t("settings.integrations.webhooks.eventTypes.ORPHAN_SPIKE")}
                  </SelectItem>
                  <SelectItem value="JOB_POSTED">
                    {t("settings.integrations.webhooks.eventTypes.JOB_POSTED")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provider Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("settings.integrations.webhooks.modal.provider")}
              </label>
              <Select
                value={provider}
                onValueChange={(val) => setProvider(val as WebhookProviderType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELEGRAM">
                    {t("settings.integrations.webhooks.providers.TELEGRAM")}
                  </SelectItem>
                  <SelectItem value="DISCORD">
                    {t("settings.integrations.webhooks.providers.DISCORD")}
                  </SelectItem>
                  <SelectItem value="GENERIC">
                    {t("settings.integrations.webhooks.providers.GENERIC")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("settings.integrations.webhooks.modal.webhookUrl")}
              </label>
              <Input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={getDynamicPlaceholder(provider)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                {provider === "TELEGRAM" &&
                  t("settings.integrations.webhooks.modal.webhookUrlHint.telegram")}
                {provider === "DISCORD" &&
                  t("settings.integrations.webhooks.modal.webhookUrlHint.discord")}
                {provider === "GENERIC" &&
                  t("settings.integrations.webhooks.modal.webhookUrlHint.generic")}
              </p>
            </div>

            {/* Telegram Chat ID (Conditional) */}
            {provider === "TELEGRAM" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("settings.integrations.webhooks.modal.chatId")}
                </label>
                <Input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-100123456789"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("settings.integrations.webhooks.modal.chatIdHint")}
                </p>
              </div>
            )}

            {/* Generic Secret Token (Conditional) */}
            {provider === "GENERIC" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("settings.integrations.webhooks.modal.secretToken")}
                </label>
                <Input
                  type="password"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  placeholder="••••••••••••••••"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("settings.integrations.webhooks.modal.secretTokenHint")}
                </p>
              </div>
            )}

            {/* Is Enabled Toggle */}
            <div className="flex items-center gap-2 pt-2">
              <input
                id="webhook-is-enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="webhook-is-enabled"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer"
              >
                {t("settings.integrations.webhooks.modal.isEnabled")}
              </label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestModal}
              disabled={testMutation.isPending}
              className="mr-auto inline-flex items-center gap-1.5"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("settings.integrations.webhooks.modal.testingButton")}</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{t("settings.integrations.webhooks.modal.testButton")}</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              {t("settings.integrations.webhooks.modal.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>{t("settings.integrations.webhooks.modal.saving")}</span>
                </>
              ) : (
                <span>{t("settings.integrations.webhooks.modal.save")}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("settings.integrations.webhooks.deleteConfirm.title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
            {t("settings.integrations.webhooks.deleteConfirm.message")}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingId(null)}
            >
              {t("settings.integrations.webhooks.deleteConfirm.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {t("settings.integrations.webhooks.deleteConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
