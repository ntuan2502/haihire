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
import type { CustomSelectOption } from "@/components/shared/custom-select";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  InviteMemberCard,
  InviteLinksCard,
  MembersListCard,
  RemoveMemberModal,
  TransferOwnershipModal,
  RevokeLinkModal,
  type MemberModalTarget,
} from "@/components/settings/members";

export default function MembersSettingsPage() {
  const { user, canEdit, isOwner, refreshUser } = useAuth();
  const { t } = useI18n();
  const canManageMembers = useHasPermission("org:manage_members");

  const roleOptions: CustomSelectOption<Role>[] = useMemo(
    () => [
      { value: Role.ADMIN, label: t("members.roleAdmin") },
      { value: Role.RECRUITER, label: t("members.roleRecruiter") },
      { value: Role.HIRING_MANAGER, label: t("members.roleHiringManager") },
      { value: Role.INTERVIEWER, label: t("members.roleInterviewer") },
      { value: Role.MEMBER, label: t("members.roleMember") },
    ],
    [t],
  );

  const getRoleLabel = useCallback(
    (role: string): string => {
      switch (role?.toUpperCase()) {
        case Role.ADMIN:
          return t("members.roleAdmin");
        case Role.RECRUITER:
          return t("members.roleRecruiter");
        case Role.HIRING_MANAGER:
          return t("members.roleHiringManager");
        case Role.INTERVIEWER:
          return t("members.roleInterviewer");
        case Role.MEMBER:
          return t("members.roleMember");
        default:
          return role || t("members.roleMember");
      }
    },
    [t],
  );

  const { data: members = [], refetch: refetchMembers } = useOrgMembers();
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("members.title")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("members.subtitle")}
          </p>
        </div>
      </div>

      {/* Action Notification */}
      {inviteSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}
      {inviteErrorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{inviteErrorMsg}</span>
        </div>
      )}

      {/* Top Action + Invite team member card */}
      <InviteMemberCard
        canEdit={canManageMembers}
        onInviteSuccess={handleInviteSuccess}
        onInviteError={handleInviteError}
      />

      {/* Invite links card */}
      <InviteLinksCard
        canEdit={canManageMembers}
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
