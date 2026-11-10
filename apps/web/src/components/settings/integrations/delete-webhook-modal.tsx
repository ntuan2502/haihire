"use client";

import { useI18n } from "@/i18n";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("settings.integrations.webhooks.deleteConfirm.message")}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#202020] shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("settings.integrations.webhooks.deleteConfirm.cancel")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : null}
          {t("settings.integrations.webhooks.deleteConfirm.confirm")}
        </Button>
      </div>
    </CustomModal>
  );
}
