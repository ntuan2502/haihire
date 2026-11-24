"use client";

import { useMemo, useState } from "react";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { getOrgRoleLabel } from "@/lib/roles";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { DerivedInviteStatus, InviteLink } from "@/types";
import {
  CheckCircle2,
  Clock,
  Mail,
  Send,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  formatInviteExpiry,
  resolveDerivedInviteStatus,
} from "./invite-format";

type EmailInviteStatusFilter =
  | "ACTIVE_AND_COMPLETED"
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "ALL";

interface EmailInvitesCardProps {
  canEdit: boolean;
  emailInvites: InviteLink[];
  isLoading?: boolean;
  mountedTime: number;
  resendingId: string | null;
  revokingId: string | null;
  getRoleLabel?: (role: string) => string;
  onResendClick: (linkId: string) => void;
  onRevokeClick: (linkId: string) => void;
  onOpenInviteForm?: () => void;
}

export function EmailInvitesCard({
  canEdit,
  emailInvites,
  isLoading = false,
  mountedTime,
  resendingId,
  revokingId,
  getRoleLabel,
  onResendClick,
  onRevokeClick,
  onOpenInviteForm,
}: EmailInvitesCardProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const [statusFilter, setStatusFilter] = useState<EmailInviteStatusFilter>(
    "ACTIVE_AND_COMPLETED",
  );

  const resolveRoleLabel = (role: string) =>
    getRoleLabel ? getRoleLabel(role) : getOrgRoleLabel(role, t);

  const enrichedInvites = useMemo(
    () =>
      emailInvites.map((invite) => ({
        invite,
        derived: resolveDerivedInviteStatus(invite, mountedTime),
      })),
    [emailInvites, mountedTime],
  );

  const filteredInvites = useMemo(() => {
    return enrichedInvites.filter(({ derived }) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "ACTIVE_AND_COMPLETED") {
        return derived !== "REVOKED";
      }
      return derived === statusFilter;
    });
  }, [enrichedInvites, statusFilter]);

  if (!canEdit) return null;

  const filterOptions: Array<{
    value: EmailInviteStatusFilter;
    label: string;
  }> = [
    { value: "ACTIVE_AND_COMPLETED", label: t("members.allActiveStatuses") },
    { value: "PENDING", label: t("members.statusPending") },
    { value: "ACCEPTED", label: t("members.statusAccepted") },
    { value: "EXPIRED", label: t("members.linkExpired") },
    { value: "REVOKED", label: t("members.statusRevoked") },
    { value: "ALL", label: t("members.allStatuses") },
  ];

  const renderStatusBadge = (derived: DerivedInviteStatus) => {
    if (derived === "ACCEPTED") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4 gap-1"
        >
          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
          <span>{t("members.statusAccepted")}</span>
        </Badge>
      );
    }
    if (derived === "PENDING") {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0 h-4 gap-1"
        >
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
          <span>{t("members.statusPending")}</span>
        </Badge>
      );
    }
    if (derived === "REVOKED") {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
        >
          {t("members.statusRevoked")}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
      >
        {t("members.linkExpired")}
      </Badge>
    );
  };

  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              {t("members.emailInvitesTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("members.emailInvitesSubtitle")}
            </p>
          </div>
        </div>

        {onOpenInviteForm && (
          <SettingsButton
            type="button"
            icon={UserPlus}
            onClick={onOpenInviteForm}
          >
            {t("members.inviteMemberTitle")}
          </SettingsButton>
        )}
      </div>

      {/* Status Filter Pills */}
      {!isLoading && emailInvites.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filterOptions.map((opt) => {
            const isSelected = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {isLoading && emailInvites.length === 0 ? (
        <LoadingSpinner />
      ) : emailInvites.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            {t("members.noEmailInvites")}
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            {t("members.noEmailInvitesDesc")}
          </p>
        </div>
      ) : filteredInvites.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t("members.noMatchingInvites")}
        </div>
      ) : (
        <div className="divide-y divide-border pt-1">
          {filteredInvites.map(({ invite, derived }) => {
            const acceptor = invite.recentUsages?.[0] ?? null;
            const expiryText =
              derived === "PENDING"
                ? formatInviteExpiry(
                    invite.expiresAt,
                    invite.status,
                    mountedTime,
                    t,
                  )
                : null;
            const metaLine = [
              t("members.invitedByLabel", {
                name: invite.createdByName || t("members.roleAdmin"),
              }),
              t("members.linkCreatedOn", {
                date: formatDate(invite.createdAt, "numeric", localization),
              }),
              expiryText,
            ]
              .filter(Boolean)
              .join(" • ");

            const isMutedRow = derived === "EXPIRED" || derived === "REVOKED";

            return (
              <div
                key={invite.id}
                className={`py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-opacity ${
                  isMutedRow ? "opacity-65" : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 mt-0.5 ${
                      isMutedRow
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {invite.invitedEmail}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 gap-1"
                      >
                        <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                        <span>{resolveRoleLabel(invite.role)}</span>
                      </Badge>
                      {renderStatusBadge(derived)}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {metaLine}
                    </p>

                    {derived === "ACCEPTED" && acceptor && (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                        <UserAvatar
                          name={acceptor.userName}
                          avatarUrl={acceptor.userAvatarUrl}
                          size="xs"
                          rounded="full"
                        />
                        <span>
                          {t("members.acceptedByOn", {
                            name: acceptor.userName,
                            date: formatDateTime(acceptor.usedAt, localization),
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(derived === "PENDING" || derived === "EXPIRED") && (
                    <SettingsButton
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Send}
                      pending={resendingId === invite.id}
                      disabled={resendingId === invite.id}
                      onClick={() => onResendClick(invite.id)}
                      className="text-xs font-medium cursor-pointer"
                    >
                      <span>{t("members.resendInvite")}</span>
                    </SettingsButton>
                  )}

                  {derived === "PENDING" && (
                    <SettingsButton
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      pending={revokingId === invite.id}
                      disabled={revokingId === invite.id}
                      onClick={() => onRevokeClick(invite.id)}
                      className="text-xs font-medium border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    >
                      <span>{t("members.revokeLink")}</span>
                    </SettingsButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsCard>
  );
}
