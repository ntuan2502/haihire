"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { useState } from "react";
import { Role } from "@haihire/shared";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/custom-select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Link2, Plus, X, Shield, Copy, Check, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel, getOrgRoleOptions } from "@/lib/roles";
import { useCreateInviteLinkMutation } from "@/hooks/use-queries";
import { useLocalization } from "@/components/providers/localization-provider";
import { formatDate } from "@/lib/utils";
import type { InviteLink } from "@/types";

interface InviteLinksCardProps {
  canEdit: boolean;
  roleOptions?: CustomSelectOption<Role>[];
  getRoleLabel?: (role: string) => string;
  serverInviteLinks: InviteLink[];
  isLoading?: boolean;
  refetchLinks: () => void;
  onRevokeClick: (linkId: string) => void;
  revokingId: string | null;
  onError: (msg: string) => void;
  displayHost: string;
  mountedTime: number;
}

export function InviteLinksCard({
  canEdit,
  roleOptions,
  getRoleLabel,
  serverInviteLinks,
  isLoading = false,
  refetchLinks,
  onRevokeClick,
  revokingId,
  onError,
  displayHost,
  mountedTime,
}: InviteLinksCardProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const createInviteMutation = useCreateInviteLinkMutation();

  const [isCreateLinkOpen, setIsCreateLinkOpen] = useState(false);
  const [linkRole, setLinkRole] = useState<Role>(Role.MEMBER);
  const [linkExpiresIn, setLinkExpiresIn] = useState("7 days");
  const [linkMaxUses, setLinkMaxUses] = useState("1");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  if (!canEdit) return null;

  const resolvedRoleOptions = roleOptions ?? getOrgRoleOptions(t);
  const resolveRoleLabel = (role: string) =>
    getRoleLabel ? getRoleLabel(role) : getOrgRoleLabel(role, t);

  const handleCreateLink = async () => {
    try {
      await createInviteMutation.mutateAsync({
        role: linkRole,
        expiresIn: linkExpiresIn,
        maxUses: linkMaxUses,
      });
      toast.success(t("members.createLinkSuccess"));
      setIsCreateLinkOpen(false);
      refetchLinks();
    } catch (err: unknown) {
      console.error(err);
      const msg = getApiErrorMessage(err, t);
      onError(msg);
    }
  };

  const handleCopyLink = (link: InviteLink) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : `http://${displayHost}`;
    const fullUrl = `${origin}/auth/join/${link.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const formatLinkExpiry = (
    expiresAt: string | null | undefined,
    status?: string,
  ): string => {
    if (status === "EXPIRED") return t("members.linkExpired");
    if (!expiresAt) return t("members.noExpiration");
    if (!mountedTime) return "";
    const diff = new Date(expiresAt).getTime() - mountedTime;
    if (diff <= 0) return t("members.linkExpired");
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return t("members.expiresInDays", { days });
  };

  return (
    <SettingsCard className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              {t("members.createLinkTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("members.pendingInvites")}
            </p>
          </div>
        </div>

        {!isCreateLinkOpen && (
          <SettingsButton
            type="button"
            onClick={() => setIsCreateLinkOpen(true)}
            icon={Plus}
          >
            {t("members.createLinkButton")}
          </SettingsButton>
        )}
      </div>

      {/* Section: New invite link (When Create link is clicked) */}
      {isCreateLinkOpen && (
        <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {t("members.createLinkTitle")}
            </span>
            <SettingsButton
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => setIsCreateLinkOpen(false)}
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </SettingsButton>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                {t("members.roleLabel")}
              </label>
              <CustomSelect
                value={linkRole}
                onChange={(val) => setLinkRole(val)}
                options={resolvedRoleOptions}
                className="w-48"
                triggerClassName="h-9 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                {t("members.expiresInLabel")}
              </label>
              <CustomSelect
                value={linkExpiresIn}
                onChange={(val) => setLinkExpiresIn(val)}
                options={[
                  { value: "1 day", label: t("members.expires1Day") },
                  { value: "7 days", label: t("members.expires7Days") },
                  { value: "30 days", label: t("members.expires30Days") },
                  { value: "Never", label: t("members.expiresNever") },
                ]}
                className="w-36"
                triggerClassName="h-9 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                {t("members.maxUsesLabel")} ({t("common.optional")})
              </label>
              <CustomSelect
                value={linkMaxUses}
                onChange={(val) => setLinkMaxUses(val)}
                options={[
                  { value: "1", label: t("members.uses1") },
                  { value: "5", label: t("members.uses5") },
                  { value: "10", label: t("members.uses10") },
                  { value: "Unlimited", label: t("members.usesUnlimited") },
                ]}
                className="w-36"
                triggerClassName="h-9 text-xs font-medium"
              />
            </div>

            <div>
              <SettingsButton
                type="button"
                pending={createInviteMutation.isPending}
                disabled={createInviteMutation.isPending}
                onClick={handleCreateLink}
              >
                {createInviteMutation.isPending
                  ? t("common.saving")
                  : t("members.createLinkButton")}
              </SettingsButton>
            </div>
          </div>
        </div>
      )}

      {/* Invite links loading / list / empty state */}
      {!isCreateLinkOpen && isLoading && serverInviteLinks.length === 0 ? (
        <LoadingSpinner />
      ) : (
        !isCreateLinkOpen &&
        serverInviteLinks.length === 0 && (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Link2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {t("members.noActiveInviteLinks")}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              {t("members.noActiveInviteLinksDesc")}
            </p>
          </div>
        )
      )}

      {serverInviteLinks.length > 0 && (
        <div className="divide-y divide-border pt-1">
          {serverInviteLinks.map((link) => {
            const isCopied = copiedLinkId === link.id;
            const isFull = Boolean(
              link.maxUses !== null && link.usesCount >= link.maxUses,
            );
            const isExpiredByDate = Boolean(
              link.status === "EXPIRED" ||
              (mountedTime > 0 &&
                link.expiresAt &&
                new Date(link.expiresAt).getTime() <= mountedTime),
            );
            const isInactive =
              isFull ||
              isExpiredByDate ||
              Boolean(link.status && link.status !== "ACTIVE");
            const expiryText = formatLinkExpiry(link.expiresAt, link.status);
            const usesText = t("members.usesCount", {
              used: link.usesCount,
              max: link.maxUses !== null ? link.maxUses : "∞",
            });
            const createdDateText = link.createdAt
              ? t("members.linkCreatedOn", {
                  date: formatDate(link.createdAt, "numeric", localization),
                })
              : null;
            const createdByText = `${t("common.created")}: ${link.createdByName || t("members.roleAdmin")}`;
            const metaLine = [
              usesText,
              expiryText,
              createdDateText,
              createdByText,
            ]
              .filter(Boolean)
              .join(" • ");

            return (
              <div
                key={link.id}
                className={`py-3 flex items-center justify-between gap-4 transition-opacity ${
                  isInactive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      isInactive
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-foreground"
                    } shrink-0`}
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Shield
                          className="h-3 w-3 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span>{resolveRoleLabel(link.role)}</span>
                      </span>

                      {!isInactive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4"
                        >
                          {t("common.active")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
                        >
                          {isFull
                            ? t("members.linkLimitReached")
                            : t("members.linkExpired")}
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {metaLine}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isInactive && (
                    <SettingsButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(link)}
                      className="text-xs font-medium gap-1 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{t("common.copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{t("members.copyLink")}</span>
                        </>
                      )}
                    </SettingsButton>
                  )}

                  <SettingsButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Trash2}
                    pending={revokingId === link.id}
                    disabled={revokingId === link.id}
                    onClick={() => onRevokeClick(link.id)}
                    className="text-xs font-medium border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <span>{t("members.revokeLink")}</span>
                  </SettingsButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsCard>
  );
}
