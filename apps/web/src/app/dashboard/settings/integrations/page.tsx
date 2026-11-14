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
import { Plus, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusState } from "@/components/shared";
import {
  WebhookSettingsTable,
  WebhookModal,
  DeleteWebhookModal,
} from "@/components/settings/integrations";
import { toast } from "@/lib/toast";
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
      <div className="w-full space-y-5 animate-in fade-in duration-200">
        <PageHeader
          title={t("settings.integrations.title")}
          subtitle={t("settings.integrations.description")}
          icon={Plug}
          bordered
        />
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/dashboard/settings"
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.integrations.title")}
        subtitle={t("settings.integrations.description")}
        icon={Plug}
        bordered
        actions={
          activeTab === "webhooks" ? (
            <Button
              id="add-webhook-btn"
              onClick={handleOpenAdd}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t("settings.integrations.webhooks.addButton")}</span>
            </Button>
          ) : undefined
        }
      />

      {/* Navigation Tabs */}
      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={cn(
            "px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
            activeTab === "webhooks"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70",
          )}
        >
          <Plug className="h-4 w-4 shrink-0" />
          <span>{t("settings.integrations.tabs.webhooks")}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
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
