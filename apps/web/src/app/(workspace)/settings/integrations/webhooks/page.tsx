"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type {
  WebhookSettingResponse,
  WebhookEventType,
  WebhookProviderType,
} from "@haihire/shared";
import { SettingsButton } from "@/components/settings/settings-button";
import {
  WebhookSettingsTable,
  WebhookModal,
  DeleteWebhookModal,
} from "@/components/settings/integrations";
import { LoadingSpinner } from "@/components/shared";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useWebhookSettingsQuery,
  useCreateWebhookSettingMutation,
  useUpdateWebhookSettingMutation,
  useDeleteWebhookSettingMutation,
  useTestWebhookSettingMutation,
} from "@/hooks/use-webhook-setting-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";

export default function WebhooksSettingsPage() {
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
    return null;
  }

  if (isLoading && webhookSettings.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SettingsButton
          id="add-webhook-btn"
          icon={Plus}
          onClick={handleOpenAdd}
        >
          {t("settings.integrations.webhooks.addButton")}
        </SettingsButton>
      </div>

      <WebhookSettingsTable
        webhookSettings={webhookSettings}
        isLoading={isLoading}
        isAdmin={canManageIntegrations}
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
