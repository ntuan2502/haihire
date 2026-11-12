"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
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
import { Plus, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WebhookSettingsTable,
  WebhookModal,
  DeleteWebhookModal,
} from "@/components/settings/integrations";
import { SettingsAccessDenied } from "@/components/settings/settings-access-denied";
import { toast } from "sonner";
import { cn } from "cn";

export default function IntegrationsSettingsPage() {
  const { t } = useI18n();
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );

  const { data: webhookSettings = [], isLoading } = useWebhookSettingsQuery({
    enabled: canManageIntegrations,
  });
  const createMutation = useCreateWebhookSettingMutation();
  const updateMutation = useUpdateWebhookSettingMutation();
  const deleteMutation = useDeleteWebhookSettingMutation();
  const testMutation = useTestWebhookSettingMutation();

  const [activeTab, setActiveTab] = useState<"webhooks">("webhooks");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] =
    useState<WebhookSettingResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingSetting(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (setting: WebhookSettingResponse) => {
    setEditingSetting(setting);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: {
    eventType: WebhookEventType;
    provider: WebhookProviderType;
    webhookUrl: string;
    secretToken?: string;
    chatId?: string;
    isEnabled: boolean;
    id?: string;
  }) => {
    try {
      if (payload.id) {
        await updateMutation.mutateAsync({
          id: payload.id,
          data: {
            eventType: payload.eventType,
            provider: payload.provider,
            webhookUrl: payload.webhookUrl,
            secretToken: payload.secretToken,
            chatId: payload.chatId,
            isEnabled: payload.isEnabled,
          },
        });
      } else {
        await createMutation.mutateAsync({
          eventType: payload.eventType,
          provider: payload.provider,
          webhookUrl: payload.webhookUrl,
          secretToken: payload.secretToken,
          chatId: payload.chatId,
          isEnabled: payload.isEnabled,
        });
      }
      toast.success(t("common.save"));
      setIsModalOpen(false);
      setEditingSetting(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("errors.GENERIC_ERROR");
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
      const msg =
        err instanceof Error ? err.message : t("errors.GENERIC_ERROR");
      toast.error(msg);
    }
  };

  const handleTest = async (payload: {
    eventType: WebhookEventType;
    provider: WebhookProviderType;
    webhookUrl: string;
    secretToken?: string;
    chatId?: string;
    id?: string;
  }) => {
    try {
      if (
        payload.id &&
        (!payload.webhookUrl || payload.webhookUrl.includes("***"))
      ) {
        await testMutation.mutateAsync({ id: payload.id });
      } else {
        await testMutation.mutateAsync({
          eventType: payload.eventType,
          provider: payload.provider,
          webhookUrl: payload.webhookUrl,
          secretToken: payload.secretToken,
          chatId: payload.chatId,
        });
      }
      toast.success(t("settings.integrations.webhooks.modal.testSuccess"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("settings.integrations.webhooks.modal.testFailed");
      toast.error(msg);
    }
  };

  const handleTestRow = async (setting: WebhookSettingResponse) => {
    try {
      await testMutation.mutateAsync({ id: setting.id });
      toast.success(t("settings.integrations.webhooks.modal.testSuccess"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("settings.integrations.webhooks.modal.testFailed");
      toast.error(msg);
    }
  };

  if (!canManageIntegrations) {
    return (
      <SettingsAccessDenied
        title={t("settings.integrations.title")}
        description={t("settings.integrations.description")}
        message={t("settings.integrations.accessDenied")}
        icon={Webhook}
      />
    );
  }

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <Button
              id="add-webhook-btn"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{t("settings.integrations.webhooks.addButton")}</span>
            </Button>
          </div>

          <WebhookSettingsTable
            webhookSettings={webhookSettings}
            isLoading={isLoading}
            isAdmin={canManageIntegrations}
            onOpenAdd={handleOpenAdd}
            onOpenEdit={handleOpenEdit}
            onDelete={(id) => setDeletingId(id)}
            onTest={handleTestRow}
            isTesting={testMutation.isPending}
          />
        </div>
      )}

      {/* Add / Edit Webhook Modal */}
      <WebhookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSetting(null);
        }}
        editingSetting={editingSetting}
        onSave={handleSave}
        onTest={handleTest}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isTesting={testMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteWebhookModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
