"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface DeleteApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  candidateName: string;
  jobTitle: string;
  isDeleting?: boolean;
}

export function DeleteApplicationModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  jobTitle,
  isDeleting = false,
}: DeleteApplicationModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("applications.deleteApplicationHeading")}
      description={
        <span>
          <strong className="font-semibold text-slate-900 dark:text-white">
            {candidateName}
          </strong>{" "}
          —{" "}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {jobTitle}
          </strong>
        </span>
      }
      notice={t("applications.deleteApplicationWarning")}
      confirmMatchText={candidateName}
      confirmButtonLabel={t("applications.deleteApplication")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isDeleting}
      variant="danger"
    />
  );
}
