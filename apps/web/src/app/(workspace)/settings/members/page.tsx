"use client";

import { useState, useMemo } from "react";
import {
  useOrgMembers,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useTransferOwnershipMutation,
} from "@/hooks/use-queries";
import { type Role } from "@haihire/shared";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { getUserDisplayName } from "@/lib/utils";
import {
  MembersListCard,
  RemoveMemberModal,
  TransferOwnershipModal,
  type MemberModalTarget,
} from "@/components/settings/members";
import { useMembersAccess } from "@/components/settings/members/use-members-access";
import { LoadingSpinner, StatusState } from "@/components/shared";

export default function MembersSettingsPage() {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const {
    user,
    isOwner,
    refreshUser,
    canManageMembers,
    canManageAdminTargets,
    roleOptions,
    inviteRoleOptions,
    getRoleLabel,
  } = useMembersAccess();

  const {
    data: members = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useOrgMembers({
    enabled: canManageMembers,
  });
  const updateMemberRoleMutation = useUpdateMemberRoleMutation();
  const removeMemberMutation = useRemoveMemberMutation();
  const transferOwnershipMutation = useTransferOwnershipMutation();

  const [memberToTransfer, setMemberToTransfer] =
    useState<MemberModalTarget | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] =
    useState<MemberModalTarget | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    try {
      setActionLoadingId(memberId);
      await updateMemberRoleMutation.mutateAsync({ memberId, role: newRole });
      toast.success(t("members.updateRoleSuccess"));
      refetchMembers?.();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t) || t("members.updateRoleError"));
      refetchMembers?.();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmTransferOwnership = async () => {
    if (!memberToTransfer) return;
    try {
      setActionLoadingId(memberToTransfer.id);
      await transferOwnershipMutation.mutateAsync(memberToTransfer.id);
      await refreshUser?.();
      refetchMembers?.();
      toast.success(t("members.transferOwnershipSuccess"));
      setIsTransferModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setActionLoadingId(memberToRemove.id);
      await removeMemberMutation.mutateAsync(memberToRemove.id);
      toast.success(t("members.removeMemberSuccess"));
      setIsRemoveModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t));
      refetchMembers?.();
    } finally {
      setActionLoadingId(null);
    }
  };

  const combinedMembers = useMemo(() => {
    if (members && members.length > 0) {
      return members
        .map((m) => ({
          id: m.id,
          name: getUserDisplayName(m, localization),
          firstName: m.firstName ?? null,
          lastName: m.lastName ?? null,
          email: m.email,
          role: m.role || "MEMBER",
          avatarUrl: m.avatarUrl,
          createdAt: m.createdAt,
          isOwner: Boolean(
            (m as { isOwner?: boolean }).isOwner ||
            (user?.organization?.ownerId && user.organization.ownerId === m.id),
          ),
          isCurrent: m.id === user?.id || m.email === user?.email,
        }))
        .sort((a, b) => {
          if (a.isOwner && !b.isOwner) return -1;
          if (!a.isOwner && b.isOwner) return 1;
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        });
    }

    if (user) {
      return [
        {
          id: user.id,
          name: getUserDisplayName(user, localization),
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isOwner: Boolean(
            user.isOwner ||
            (user.organization?.ownerId &&
              user.organization.ownerId === user.id),
          ),
          isCurrent: true,
        },
      ];
    }

    return [];
  }, [members, user, localization]);

  if (!canManageMembers) {
    return (
      <StatusState
        status="403"
        variant="card"
        actionLabel={t("settings.backToSettings")}
        actionHref="/settings"
      />
    );
  }

  if (membersLoading && members.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <MembersListCard
        members={combinedMembers}
        isLoading={Boolean(membersLoading)}
        canManageMembers={canManageMembers}
        canEdit={canManageMembers}
        isOwner={isOwner}
        canManageAdminTargets={canManageAdminTargets}
        currentUserId={user?.id}
        actionLoadingId={actionLoadingId}
        roleOptions={inviteRoleOptions}
        filterRoleOptions={roleOptions}
        getRoleLabel={getRoleLabel}
        onRoleChange={handleRoleChange}
        onTransferOwnershipClick={(m) => {
          setMemberToTransfer(m);
          setIsTransferModalOpen(true);
        }}
        onRemoveMemberClick={(m) => {
          setMemberToRemove(m);
          setIsRemoveModalOpen(true);
        }}
      />

      <RemoveMemberModal
        isOpen={isRemoveModalOpen}
        member={memberToRemove}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleConfirmRemoveMember}
        isLoading={actionLoadingId === memberToRemove?.id}
      />

      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        member={memberToTransfer}
        onClose={() => setIsTransferModalOpen(false)}
        onConfirm={handleConfirmTransferOwnership}
        isLoading={actionLoadingId === memberToTransfer?.id}
      />
    </div>
  );
}
