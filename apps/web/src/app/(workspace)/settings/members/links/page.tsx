"use client";

import { useState, useMemo } from "react";
import { useInviteLinks } from "@/hooks/use-queries";
import type { InviteLink } from "@haihire/shared";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import {
  InviteLinksCard,
  InviteUsageDrawer,
  RevokeLinkModal,
} from "@/components/settings/members";
import { partitionOrgInvites } from "@/components/settings/members/invite-format";
import { useMembersAccess } from "@/components/settings/members/use-members-access";
import { useMembersInviteActions } from "@/components/settings/members/use-members-invites";
import { StatusState } from "@/components/shared";

export default function MemberInviteLinksPage() {
  const { t } = useI18n();
  const { canManageMembers, inviteRoleOptions, getRoleLabel } =
    useMembersAccess();

  const {
    data: serverInviteLinks = [],
    isLoading: linksLoading,
    refetch: refetchLinks,
  } = useInviteLinks({ enabled: canManageMembers, includeRevoked: true });

  const {
    mountedTime,
    linkToRevoke,
    isRevokeModalOpen,
    revokingId,
    openRevokeModal,
    closeRevokeModal,
    handleConfirmRevokeLink,
  } = useMembersInviteActions(refetchLinks);

  const [usageDrawerLink, setUsageDrawerLink] = useState<InviteLink | null>(
    null,
  );
  const [appHost] = useState(() =>
    typeof window !== "undefined" ? window.location.host : "",
  );

  const { shareableLinks } = useMemo(
    () => partitionOrgInvites(serverInviteLinks),
    [serverInviteLinks],
  );

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
      <InviteLinksCard
        canEdit={canManageMembers}
        roleOptions={inviteRoleOptions}
        getRoleLabel={getRoleLabel}
        serverInviteLinks={shareableLinks}
        isLoading={Boolean(linksLoading)}
        refetchLinks={refetchLinks}
        onRevokeClick={openRevokeModal}
        onViewUsagesClick={(link) => setUsageDrawerLink(link)}
        revokingId={revokingId}
        onError={(msg) => toast.error(msg)}
        displayHost={appHost || "localhost:3000"}
        mountedTime={mountedTime}
      />

      <InviteUsageDrawer
        link={usageDrawerLink}
        isOpen={Boolean(usageDrawerLink)}
        onClose={() => setUsageDrawerLink(null)}
        getRoleLabel={getRoleLabel}
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
