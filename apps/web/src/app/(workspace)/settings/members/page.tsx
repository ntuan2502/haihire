"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import {
  useOrgMembers,
  useInviteLinks,
  useRevokeInviteLinkMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useTransferOwnershipMutation,
} from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { Role } from "@haihire/shared";
import { Users, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel, getOrgRoleOptions } from "@/lib/roles";
import { getUserDisplayName } from "@/lib/utils";
import {
  InviteMemberCard,
  InviteLinksCard,
  MembersListCard,
  RemoveMemberModal,
  TransferOwnershipModal,
  RevokeLinkModal,
  type MemberModalTarget,
} from "@/components/settings/members";
import { LoadingSpinner, PageHeader, StatusState } from "@/components/shared";

export default function MembersSettingsPage() {
  const { user, isOwner, refreshUser } = useAuth();
  const { t } = useI18n();
  const canManageMembers = useHasPermission("org:manage_members");
  const canInviteAdmin = Boolean(isOwner || user?.role === Role.ADMIN);

  const roleOptions = useMemo(() => getOrgRoleOptions(t), [t]);
  const inviteRoleOptions = useMemo(
    () => getOrgRoleOptions(t, { excludeAdmin: !canInviteAdmin }),
    [t, canInviteAdmin],
  );

  const getRoleLabel = useCallback(
    (role: string): string => getOrgRoleLabel(role, t),
    [t],
  );

  const {
    data: members = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useOrgMembers({
    enabled: canManageMembers,
  });
  const {
    data: serverInviteLinks = [],
    isLoading: linksLoading,
    refetch: refetchLinks,
  } = useInviteLinks({ enabled: canManageMembers });
  const revokeInviteMutation = useRevokeInviteLinkMutation();
  const updateMemberRoleMutation = useUpdateMemberRoleMutation();
  const removeMemberMutation = useRemoveMemberMutation();
  const transferOwnershipMutation = useTransferOwnershipMutation();

  const [memberToTransfer, setMemberToTransfer] =
    useState<MemberModalTarget | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] =
    useState<MemberModalTarget | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [linkToRevoke, setLinkToRevoke] = useState<string | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [appHost] = useState(() =>
    typeof window !== "undefined" ? window.location.host : "",
  );

  const [mountedTime, setMountedTime] = useState<number>(0);
  useEffect(() => {
    setMountedTime(Date.now());
  }, []);

  const handleInviteSuccess = (msg: string) => {
    toast.success(msg);
  };

  const handleInviteError = (msg: string) => {
    toast.error(msg);
  };

  const handleConfirmRevokeLink = async () => {
    if (!linkToRevoke) return;
    try {
      setRevokingId(linkToRevoke);
      await revokeInviteMutation.mutateAsync(linkToRevoke);
      await refetchLinks();
      setIsRevokeModalOpen(false);
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, t);
      toast.error(msg);
      refetchLinks?.();
    } finally {
      setRevokingId(null);
    }
  };

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
          name: getUserDisplayName(m),
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
          name: getUserDisplayName(user),
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
  }, [members, user]);

  const header = (
    <PageHeader
      title={t("members.title")}
      subtitle={t("members.subtitle")}
      icon={Users}
      bordered
      actions={
        canManageMembers && !isInviteOpen ? (
          <SettingsButton
            type="button"
            icon={UserPlus}
            onClick={() => setIsInviteOpen(true)}
          >
            {t("members.inviteMemberTitle")}
          </SettingsButton>
        ) : undefined
      }
    />
  );

  if (!canManageMembers) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {header}
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/settings"
        />
      </div>
    );
  }

  if (
    (membersLoading && members.length === 0) ||
    (linksLoading && serverInviteLinks.length === 0)
  ) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {header}

      {/* Top Action + Invite team member card */}
      <InviteMemberCard
        canEdit={canManageMembers}
        roleOptions={inviteRoleOptions}
        getRoleLabel={getRoleLabel}
        onInviteSuccess={handleInviteSuccess}
        onInviteError={handleInviteError}
        isOpen={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        hideTrigger
      />

      {/* Invite links card */}
      <InviteLinksCard
        canEdit={canManageMembers}
        roleOptions={inviteRoleOptions}
        getRoleLabel={getRoleLabel}
        serverInviteLinks={serverInviteLinks}
        isLoading={Boolean(linksLoading)}
        refetchLinks={refetchLinks}
        onRevokeClick={(linkId) => {
          setLinkToRevoke(linkId);
          setIsRevokeModalOpen(true);
        }}
        revokingId={revokingId}
        onError={(msg) => toast.error(msg)}
        displayHost={appHost || "localhost:3000"}
        mountedTime={mountedTime}
      />

      {/* Team members list card */}
      <MembersListCard
        members={combinedMembers}
        isLoading={Boolean(membersLoading)}
        canManageMembers={canManageMembers}
        canEdit={canManageMembers}
        isOwner={isOwner}
        currentUserId={user?.id}
        actionLoadingId={actionLoadingId}
        roleOptions={roleOptions}
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

      {/* Confirmation Modals */}
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

      <RevokeLinkModal
        isOpen={isRevokeModalOpen}
        linkId={linkToRevoke}
        onClose={() => setIsRevokeModalOpen(false)}
        onConfirm={handleConfirmRevokeLink}
        isLoading={!!revokingId}
      />
    </div>
  );
}
