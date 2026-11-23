"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  documentName?: string;
  isLoading?: boolean;
}

export function DeleteDocumentModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  isLoading = false,
}: DeleteDocumentModalProps) {
  const { t } = useI18n();

  const trimmedName = documentName?.trim();
  const targetMatch = trimmedName || t("common.deleteConfirmWord");

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("applications.deleteDocumentHeading")}
      description={t("applications.deleteDocumentWarning")}
      notice={
        trimmedName ? (
          <span className="font-medium text-foreground break-all">
            {trimmedName}
          </span>
        ) : undefined
      }
      confirmMatchText={targetMatch}
      confirmButtonLabel={t("common.delete")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isLoading}
      variant="danger"
    />
  );
}
