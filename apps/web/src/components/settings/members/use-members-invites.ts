"use client";

import { useState, useEffect, useCallback } from "react";
import { useRevokeInviteLinkMutation } from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";

/**
 * Provides client-mounted reference timestamp and shared invite revocation modal state
 * across /settings/members/invitations and /settings/members/links.
 */
export function useMembersInviteActions(refetchLinks: () => unknown) {
  const { t } = useI18n();
  const revokeInviteMutation = useRevokeInviteLinkMutation();

  const [mountedTime, setMountedTime] = useState<number>(0);
  useEffect(() => {
    setMountedTime(Date.now());
  }, []);

  const [linkToRevoke, setLinkToRevoke] = useState<string | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const openRevokeModal = useCallback((linkId: string) => {
    setLinkToRevoke(linkId);
    setIsRevokeModalOpen(true);
  }, []);

  const closeRevokeModal = useCallback(() => {
    setIsRevokeModalOpen(false);
  }, []);

  const handleConfirmRevokeLink = useCallback(async () => {
    if (!linkToRevoke) return;
    try {
      setRevokingId(linkToRevoke);
      await revokeInviteMutation.mutateAsync(linkToRevoke);
      toast.success(t("members.revokeLinkSuccess"));
      await refetchLinks();
      setIsRevokeModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t));
      await refetchLinks();
    } finally {
      setRevokingId(null);
    }
  }, [linkToRevoke, revokeInviteMutation, refetchLinks, t]);

  return {
    mountedTime,
    linkToRevoke,
    isRevokeModalOpen,
    revokingId,
    openRevokeModal,
    closeRevokeModal,
    handleConfirmRevokeLink,
  };
}
