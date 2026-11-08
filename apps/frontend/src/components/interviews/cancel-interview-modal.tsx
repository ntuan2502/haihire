"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface CancelInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  candidateName?: string;
  isCancelling?: boolean;
}

export function CancelInterviewModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  isCancelling = false,
}: CancelInterviewModalProps) {
  const { t } = useI18n();
  const loading = isCancelling;

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("interviews.cancelInterviewTitle")}
      description={
        candidateName ? (
          <span>
            {t("interviews.cancelInterviewWarning")}{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              ({candidateName})
            </strong>
          </span>
        ) : (
          t("interviews.cancelInterviewWarning")
        )
      }
      confirmMatchText={t("common.cancelConfirmWord")}
      confirmButtonLabel={t("interviews.cancelThisSchedule")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={loading}
      variant="warning"
    />
  );
}
