"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { useI18n } from "@/i18n";
import { CustomModal } from "@/components/shared";

export interface DeleteWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteWebhookModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteWebhookModalProps) {
  const { t } = useI18n();

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.integrations.webhooks.deleteConfirm.title")}
      size="sm"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("settings.integrations.webhooks.deleteConfirm.message")}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30 shrink-0">
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>
          {t("settings.integrations.webhooks.deleteConfirm.cancel")}
        </SettingsButton>
        <SettingsButton
          variant="destructive"
          size="sm"
          pending={isDeleting}
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {t("settings.integrations.webhooks.deleteConfirm.confirm")}
        </SettingsButton>
      </div>
    </CustomModal>
  );
}
