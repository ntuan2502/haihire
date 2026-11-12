"use client";

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
import { CheckCircle2, AlertCircle, Users, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel, getOrgRoleOptions } from "@/lib/roles";
import {
  InviteMemberCard,
  InviteLinksCard,
  MembersListCard,
  RemoveMemberModal,
  TransferOwnershipModal,
  RevokeLinkModal,
  type MemberModalTarget,
} from "@/components/settings/members";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusState } from "@/components/shared";

export default function MembersSettingsPage() {
  const { user, canEdit, isOwner, refreshUser } = useAuth();
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

  const { data: members = [], refetch: refetchMembers } = useOrgMembers({
    enabled: canManageMembers,
  });
  const { data: serverInviteLinks = [], refetch: refetchLinks } =
    useInviteLinks({ enabled: canManageMembers });
  const revokeInviteMutation = useRevokeInviteLinkMutation();
  const updateMemberRoleMutation = useUpdateMemberRoleMutation();
  const removeMemberMutation = useRemoveMemberMutation();
  const transferOwnershipMutation = useTransferOwnershipMutation();

  const [memberToTransfer, setMemberToTransfer] =
    useState<MemberModalTarget | null>(null);
  const [memberToRemove, setMemberToRemove] =
    useState<MemberModalTarget | null>(null);
  const [linkToRevoke, setLinkToRevoke] = useState<string | null>(null);

  const [openMenuMemberId, setOpenMenuMemberId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);

  const [appHost, setAppHost] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppHost(window.location.host);
    }
  }, []);

  const [mountedTime, setMountedTime] = useState<number>(0);
  useEffect(() => {
    setMountedTime(Date.now());
  }, []);

  const handleInviteSuccess = (msg: string) => {
    setInviteSuccessMsg(msg);
    setTimeout(() => setInviteSuccessMsg(null), 4000);
  };

  const handleInviteError = (msg: string) => {
    setInviteErrorMsg(msg);
  };

  const handleConfirmRevokeLink = async () => {
    if (!linkToRevoke) return;
    try {
      setRevokingId(linkToRevoke);
      await revokeInviteMutation.mutateAsync(linkToRevoke);
      await refetchLinks();
      setLinkToRevoke(null);
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, t);
      setInviteErrorMsg(msg);
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
      setOpenMenuMemberId(null);
      setMemberToTransfer(null);
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
      setOpenMenuMemberId(null);
      setMemberToRemove(null);
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
          name: m.name,
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
          name: user.name,
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
          <Button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-2 shadow-sm shadow-blue-600/20"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span>{t("members.inviteMemberTitle")}</span>
          </Button>
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
          description={t("members.accessDenied")}
          actionLabel={t("settings.backToSettings")}
          actionHref="/dashboard/settings"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {header}

      {/* Action Notification */}
      {inviteSuccessMsg && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}
      {inviteErrorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{inviteErrorMsg}</span>
        </div>
      )}

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
        refetchLinks={refetchLinks}
        onRevokeClick={(linkId) => setLinkToRevoke(linkId)}
        revokingId={revokingId}
        onError={(msg) => setInviteErrorMsg(msg)}
        displayHost={appHost || "localhost:3000"}
        mountedTime={mountedTime}
      />

      {/* Team members list card */}
      <MembersListCard
        members={combinedMembers}
        canManageMembers={canManageMembers}
        canEdit={canEdit}
        isOwner={isOwner}
        currentUserId={user?.id}
        actionLoadingId={actionLoadingId}
        roleOptions={roleOptions}
        getRoleLabel={getRoleLabel}
        openMenuMemberId={openMenuMemberId}
        onOpenMenuChange={setOpenMenuMemberId}
        onRoleChange={handleRoleChange}
        onTransferOwnershipClick={(m) => setMemberToTransfer(m)}
        onRemoveMemberClick={(m) => setMemberToRemove(m)}
      />

      {/* Confirmation Modals */}
      <RemoveMemberModal
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        isLoading={actionLoadingId === memberToRemove?.id}
      />

      <TransferOwnershipModal
        member={memberToTransfer}
        onClose={() => setMemberToTransfer(null)}
        onConfirm={handleConfirmTransferOwnership}
        isLoading={actionLoadingId === memberToTransfer?.id}
      />

      <RevokeLinkModal
        linkId={linkToRevoke}
        onClose={() => setLinkToRevoke(null)}
        onConfirm={handleConfirmRevokeLink}
        isLoading={!!revokingId}
      />
    </div>
  );
}
