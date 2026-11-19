"use client";

import { SettingsButton } from "@/components/settings/settings-button";
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
import { PageHeader, StatusState } from "@/components/shared";
import {
  WebhookSettingsTable,
  WebhookModal,
  DeleteWebhookModal,
} from "@/components/settings/integrations";
import { getApiErrorMessage } from "@/lib/api-error";
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
  const [deletingTarget, setDeletingTarget] = useState<{
    id: string;
    label?: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const handleDelete = async () => {
    if (!deletingTarget) return;
    try {
      await deleteMutation.mutateAsync(deletingTarget.id);
      toast.success(t("common.delete"));
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
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
      toast.error(
        getApiErrorMessage(
          err,
          t,
          "settings.integrations.webhooks.modal.testFailed",
        ),
      );
    }
  };

  const handleTestRow = async (setting: WebhookSettingResponse) => {
    try {
      await testMutation.mutateAsync({ id: setting.id });
      toast.success(t("settings.integrations.webhooks.modal.testSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          t,
          "settings.integrations.webhooks.modal.testFailed",
        ),
      );
    }
  };

  if (!canManageIntegrations) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200">
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
          actionHref="/settings"
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.integrations.title")}
        subtitle={t("settings.integrations.description")}
        icon={Plug}
        bordered
        actions={
          activeTab === "webhooks" ? (
            <SettingsButton
              id="add-webhook-btn"
              icon={Plus}
              onClick={handleOpenAdd}
            >
              {t("settings.integrations.webhooks.addButton")}
            </SettingsButton>
          ) : undefined
        }
      />

      {/* Navigation Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap",
            activeTab === "webhooks"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          <Plug className="h-4 w-4 shrink-0" aria-hidden="true" />
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
            onDelete={(id) => {
              const found = webhookSettings.find((s) => s.id === id);
              setDeletingTarget({
                id,
                label: found?.webhookUrl || found?.provider,
              });
              setIsDeleteModalOpen(true);
            }}
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
        targetLabel={deletingTarget?.label}
      />
    </div>
  );
}
