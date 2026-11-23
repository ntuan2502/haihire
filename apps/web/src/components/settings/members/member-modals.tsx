"use client";

import { ConfirmDestructiveModal } from "@/components/shared";
import { useI18n } from "@/i18n";

export interface MemberModalTarget {
  id: string;
  name: string;
}

interface RemoveMemberModalProps {
  isOpen?: boolean;
  member: MemberModalTarget | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
}

export function RemoveMemberModal({
  isOpen,
  member,
  onClose,
  onConfirm,
  isLoading,
}: RemoveMemberModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen ?? Boolean(member)}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("members.removeMemberConfirmTitle")}
      description={t("members.removeMemberConfirmWarning")}
      notice={
        member ? (
          <span className="font-semibold text-foreground break-words">
            {member.name}
          </span>
        ) : undefined
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
  isOpen?: boolean;
  member: MemberModalTarget | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
}

export function TransferOwnershipModal({
  isOpen,
  member,
  onClose,
  onConfirm,
  isLoading,
}: TransferOwnershipModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen ?? Boolean(member)}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("members.transferOwnershipConfirmTitle")}
      description={t("members.transferOwnershipConfirmDesc")}
      notice={
        member ? (
          <div className="space-y-1">
            <p className="font-semibold text-foreground break-words">
              {member.name}
            </p>
            <p>{t("members.transferOwnershipConfirmNote")}</p>
          </div>
        ) : (
          t("members.transferOwnershipConfirmNote")
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
  isOpen?: boolean;
  linkId: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
}

export function RevokeLinkModal({
  isOpen,
  linkId,
  onClose,
  onConfirm,
  isLoading,
}: RevokeLinkModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen ?? Boolean(linkId)}
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
