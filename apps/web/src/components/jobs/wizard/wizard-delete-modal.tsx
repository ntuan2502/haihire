"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface WizardDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  jobTitle: string;
  isDeleting: boolean;
}

export function WizardDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  isDeleting,
}: WizardDeleteModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("jobs.wizard.deleteConfirmTitle")}
      description={t("jobs.wizard.deleteConfirmQuestion", { title: jobTitle })}
      notice={t("jobs.wizard.deleteConfirmNotice")}
      confirmMatchText={jobTitle}
      confirmButtonLabel={t("jobs.wizard.confirmDeleteButton")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isDeleting}
      variant="danger"
    />
  );
}
