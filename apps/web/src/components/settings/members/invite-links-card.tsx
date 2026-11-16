"use client";

import { useState } from "react";
import { Role } from "@haihire/shared";
import { Button } from "@/components/ui/button";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/custom-select";
import {
  Link2,
  Plus,
  X,
  Shield,
  Copy,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel, getOrgRoleOptions } from "@/lib/roles";
import { useCreateInviteLinkMutation } from "@/hooks/use-queries";
import type { InviteLink } from "@/types";

interface InviteLinksCardProps {
  canEdit: boolean;
  roleOptions?: CustomSelectOption<Role>[];
  getRoleLabel?: (role: string) => string;
  serverInviteLinks: InviteLink[];
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
  refetchLinks,
  onRevokeClick,
  revokingId,
  onError,
  displayHost,
  mountedTime,
}: InviteLinksCardProps) {
  const { t } = useI18n();
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
      setIsCreateLinkOpen(false);
      refetchLinks();
    } catch (err: unknown) {
      console.error(err);
      const msg = getApiErrorMessage(err, t);
      onError(msg);
      toast.error(msg);
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

  const calculateDaysRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return "never";
    const current = mountedTime || 0;
    if (!current) return "7d";
    const diff = new Date(expiresAt).getTime() - current;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d` : "expired";
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Link2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {t("members.createLinkTitle")}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("members.pendingInvites")}
            </p>
          </div>
        </div>

        {!isCreateLinkOpen && (
          <Button
            type="button"
            onClick={() => setIsCreateLinkOpen(true)}
            className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("members.createLinkButton")}</span>
          </Button>
        )}
      </div>

      {/* Section: New invite link (When Create link is clicked) */}
      {isCreateLinkOpen && (
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("members.createLinkTitle")}
            </span>
            <button
              type="button"
              onClick={() => setIsCreateLinkOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t("members.roleLabel")}
              </label>
              <CustomSelect
                value={linkRole}
                onChange={(val) => setLinkRole(val)}
                options={resolvedRoleOptions}
                className="w-48"
                triggerClassName="h-9 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
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
                triggerClassName="h-9 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
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
                triggerClassName="h-9 text-xs font-semibold"
              />
            </div>

            <div>
              <Button
                type="button"
                disabled={createInviteMutation.isPending}
                onClick={handleCreateLink}
                className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {createInviteMutation.isPending
                  ? t("common.saving")
                  : t("members.createLinkButton")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite links list / empty state */}
      {!isCreateLinkOpen && serverInviteLinks.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Link2 className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("members.noActiveInviteLinks")}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {t("members.noActiveInviteLinksDesc")}
          </p>
        </div>
      )}

      {serverInviteLinks.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
          {serverInviteLinks.map((link) => {
            const isCopied = copiedLinkId === link.id;
            const isFull =
              link.maxUses !== null && link.usesCount >= link.maxUses;
            const isInactive = link.status !== "ACTIVE" || isFull;
            const daysRemaining = calculateDaysRemaining(link.expiresAt);

            return (
              <div
                key={link.id}
                className={`py-3 flex items-center justify-between gap-4 transition-opacity ${
                  isFull ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      isFull
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                    } shrink-0`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-slate-400" />
                        <span>{resolveRoleLabel(link.role)}</span>
                      </span>

                      {isInactive && (
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {t("common.inactive")}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {link.usesCount}/
                      {link.maxUses !== null ? link.maxUses : "∞"}{" "}
                      {t("candidates.columns.applications").toLowerCase()}
                      {" • "}
                      {t("members.expiresInLabel")} {daysRemaining}
                      {" • "}
                      {t("common.created")}:{" "}
                      {link.createdByName || t("members.roleAdmin")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isFull && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(link)}
                      className="h-8 text-xs font-semibold gap-1 rounded-lg cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{t("members.copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>{t("members.copyLink")}</span>
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingId === link.id}
                    onClick={() => onRevokeClick(link.id)}
                    className="h-8 text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    {revokingId === link.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>{t("members.revokeLink")}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
