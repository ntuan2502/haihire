"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface DeleteCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  candidateName: string;
  isDeleting?: boolean;
}

export function DeleteCandidateModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  isDeleting = false,
}: DeleteCandidateModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("applications.deleteCandidateHeading")}
      description={t("applications.deleteCandidateDescription", { name: candidateName })}
      notice={t("applications.deleteCandidateWarning")}
      confirmMatchText={candidateName}
      confirmButtonLabel={t("candidates.deleteCandidate")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isDeleting}
      variant="danger"
    />
  );
}
