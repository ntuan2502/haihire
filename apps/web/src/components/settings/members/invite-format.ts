import type { DerivedInviteStatus, InviteLink } from "@/types";
import type { TranslationKey } from "@/i18n";

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

/**
 * Computes consistent UI invite status from explicit backend derivedStatus
 * or falls back cleanly for partial client fixtures.
 */
export function resolveDerivedInviteStatus(
  link: InviteLink,
  referenceNow: number,
): DerivedInviteStatus {
  if (link.derivedStatus) {
    return link.derivedStatus;
  }
  if (link.status === "REVOKED") {
    return "REVOKED";
  }
  const isExpiredByDate = Boolean(
    link.status === "EXPIRED" ||
    (referenceNow > 0 &&
      link.expiresAt &&
      new Date(link.expiresAt).getTime() <= referenceNow),
  );
  if (link.inviteType === "EMAIL" || link.invitedEmail) {
    if (link.usesCount > 0) return "ACCEPTED";
    if (isExpiredByDate) return "EXPIRED";
    return "PENDING";
  }
  const isFull = Boolean(
    link.maxUses !== null && link.usesCount >= link.maxUses,
  );
  if (isFull) return "LIMIT_REACHED";
  if (isExpiredByDate) return "EXPIRED";
  return "ACTIVE";
}

/**
 * Formats an invitation's expiration state using localized labels without impure render calls.
 */
export function formatInviteExpiry(
  expiresAt: string | null | undefined,
  status: string | undefined,
  referenceNow: number,
  t: TranslateFn,
): string {
  if (status === "EXPIRED") return t("members.linkExpired");
  if (!expiresAt) return t("members.noExpiration");
  if (!referenceNow) return "";
  const diff = new Date(expiresAt).getTime() - referenceNow;
  if (diff <= 0) return t("members.linkExpired");
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return t("members.expiresInDays", { days });
}
