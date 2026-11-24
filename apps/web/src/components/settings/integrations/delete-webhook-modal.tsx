"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface DeleteWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting: boolean;
  targetLabel?: string;
}

export function DeleteWebhookModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  targetLabel,
}: DeleteWebhookModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("settings.integrations.webhooks.deleteConfirm.title")}
      description={t("settings.integrations.webhooks.deleteConfirm.message")}
      notice={
        targetLabel ? (
          <span className="font-mono text-xs text-foreground break-all">
            {targetLabel}
          </span>
        ) : undefined
      }
      confirmButtonLabel={t(
        "settings.integrations.webhooks.deleteConfirm.confirm",
      )}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isDeleting}
      variant="danger"
    />
  );
}
