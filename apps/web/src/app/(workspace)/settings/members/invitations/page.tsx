"use client";

import { useState, useMemo } from "react";
import {
  useInviteLinks,
  useResendInviteLinkMutation,
} from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  InviteMemberCard,
  EmailInvitesCard,
  RevokeLinkModal,
} from "@/components/settings/members";
import { partitionOrgInvites } from "@/components/settings/members/invite-format";
import { useMembersAccess } from "@/components/settings/members/use-members-access";
import { useMembersInviteActions } from "@/components/settings/members/use-members-invites";
import { StatusState } from "@/components/shared";

export default function MemberInvitationsPage() {
  const { t } = useI18n();
  const { canManageMembers, inviteRoleOptions, getRoleLabel } =
    useMembersAccess();

  const {
    data: serverInviteLinks = [],
    isLoading: linksLoading,
    refetch: refetchLinks,
  } = useInviteLinks({ enabled: canManageMembers, includeRevoked: true });
  const resendInviteMutation = useResendInviteLinkMutation();

  const {
    mountedTime,
    linkToRevoke,
    isRevokeModalOpen,
    revokingId,
    openRevokeModal,
    closeRevokeModal,
    handleConfirmRevokeLink,
  } = useMembersInviteActions(refetchLinks);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { emailInvites } = useMemo(
    () => partitionOrgInvites(serverInviteLinks),
    [serverInviteLinks],
  );

  const handleInviteSuccess = (msg: string) => {
    toast.success(msg);
    refetchLinks?.();
  };

  const handleInviteError = (msg: string) => {
    toast.error(msg);
  };

  const handleResendInvite = async (linkId: string) => {
    try {
      setResendingId(linkId);
      const resent = await resendInviteMutation.mutateAsync(linkId);
      toast.success(
        t("members.resendInviteSuccess", {
          email: resent.invitedEmail || "",
        }),
      );
      await refetchLinks();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setResendingId(null);
    }
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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

      <EmailInvitesCard
        canEdit={canManageMembers}
        emailInvites={emailInvites}
        isLoading={Boolean(linksLoading)}
        mountedTime={mountedTime}
        resendingId={resendingId}
        revokingId={revokingId}
        getRoleLabel={getRoleLabel}
        onResendClick={handleResendInvite}
        onRevokeClick={openRevokeModal}
        onOpenInviteForm={
          !isInviteOpen ? () => setIsInviteOpen(true) : undefined
        }
      />

      <RevokeLinkModal
        isOpen={isRevokeModalOpen}
        linkId={linkToRevoke}
        onClose={closeRevokeModal}
        onConfirm={handleConfirmRevokeLink}
        isLoading={!!revokingId}
      />
    </div>
  );
}
