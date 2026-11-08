"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface MemberModalTarget {
  id: string;
  name: string;
}

interface RemoveMemberModalProps {
  member: MemberModalTarget | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function RemoveMemberModal({
  member,
  onClose,
  onConfirm,
  isLoading,
}: RemoveMemberModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={!!member}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("members.removeMemberConfirmTitle")}
      description={
        member ? (
          <span>
            {t("members.removeMemberConfirmWarning")}{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              ({member.name})
            </strong>
          </span>
        ) : (
          t("members.removeMemberConfirmWarning")
        )
      }
      confirmMatchText={member?.name}
      confirmButtonLabel={t("members.removeMember")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isLoading}
      variant="danger"
    />
  );
}

interface TransferOwnershipModalProps {
  member: MemberModalTarget | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function TransferOwnershipModal({
  member,
  onClose,
  onConfirm,
  isLoading,
}: TransferOwnershipModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={!!member}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("members.transferOwnershipConfirmTitle")}
      description={
        member ? (
          <span>
            {t("members.transferOwnershipConfirmDesc")}{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              ({member.name})
            </strong>
            ? {t("members.transferOwnershipConfirmNote")}
          </span>
        ) : (
          t("members.transferOwnershipConfirmDesc")
        )
      }
      confirmButtonLabel={t("members.transferOwnershipConfirmButton")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isLoading}
      variant="warning"
    />
  );
}

interface RevokeLinkModalProps {
  linkId: string | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function RevokeLinkModal({
  linkId,
  onClose,
  onConfirm,
  isLoading,
}: RevokeLinkModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={!!linkId}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("members.revokeLinkConfirmTitle")}
      description={t("members.revokeLinkConfirmWarning")}
      confirmMatchText={t("common.revokeConfirmWord")}
      confirmButtonLabel={t("members.revokeLink")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={isLoading}
      variant="warning"
    />
  );
}
