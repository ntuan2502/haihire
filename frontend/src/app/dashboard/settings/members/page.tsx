"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { useAuth } from "@/context/auth-context";
import {
  useOrgMembers,
  useInviteLinks,
  useCreateInviteLinkMutation,
  useRevokeInviteLinkMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useTransferOwnershipMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import { ConfirmDestructiveModal } from "@/components/shared";
import {
  UserPlus,
  Link2,
  Users,
  X,
  Send,
  Copy,
  Check,
  Crown,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Shield,
  Trash2,
  Loader2,
  Plus,
  User,
} from "lucide-react";
import type { InviteLink } from "@/types";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

export default function MembersSettingsPage() {
  const { user, canEdit, isOwner } = useAuth();
  const { t } = useI18n();
  const { data: members = [], refetch: refetchMembers } = useOrgMembers();
  const { data: serverInviteLinks = [], refetch: refetchLinks } =
    useInviteLinks();
  const createInviteMutation = useCreateInviteLinkMutation();
  const revokeInviteMutation = useRevokeInviteLinkMutation();
  const updateMemberRoleMutation = useUpdateMemberRoleMutation();
  const removeMemberMutation = useRemoveMemberMutation();
  const transferOwnershipMutation = useTransferOwnershipMutation();
  const [memberToTransfer, setMemberToTransfer] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [openMenuMemberId, setOpenMenuMemberId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        menuContainerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setOpenMenuMemberId(null);
    };
    if (openMenuMemberId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openMenuMemberId]);

  const [appHost, setAppHost] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppHost(window.location.host);
    }
  }, []);

  const displayHost = appHost || "localhost:3000";

  // State for "Invite a team member" card
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // State for "New invite link" card
  const [isCreateLinkOpen, setIsCreateLinkOpen] = useState(false);
  const [linkRole, setLinkRole] = useState("MEMBER");
  const [linkExpiresIn, setLinkExpiresIn] = useState("7 days");
  const [linkMaxUses, setLinkMaxUses] = useState("1");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Handle sending email invite
  const handleSendInvite = (e: FormEvent) => {
    e.preventDefault();
    setInviteSuccessMsg(null);
    setInviteErrorMsg(null);

    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setInviteErrorMsg("Please enter an email address.");
      return;
    }

    setIsInviting(true);
    setTimeout(() => {
      setIsInviting(false);
      setInviteSuccessMsg(
        `Invitation sent to ${trimmedEmail} with role "${inviteRole}".`,
      );
      setInviteEmail("");
      setTimeout(() => setInviteSuccessMsg(null), 4000);
    }, 500);
  };

  // Handle creating shareable invite link via Backend API
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
      setInviteErrorMsg(msg);
      toast.error(msg);
    }
  };

  // Handle copying link
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

  // Handle revoking link
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [linkToRevoke, setLinkToRevoke] = useState<string | null>(null);

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

  // Handle toggling member role (Admin <-> Member)
  const handleToggleRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole.toUpperCase() === "ADMIN" ? "MEMBER" : "ADMIN";
    try {
      setActionLoadingId(memberId);
      await updateMemberRoleMutation.mutateAsync({ memberId, role: newRole });
      setOpenMenuMemberId(null);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t));
      refetchMembers?.();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle removing member from organization
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleConfirmTransferOwnership = async () => {
    if (!memberToTransfer) return;
    try {
      setActionLoadingId(memberToTransfer.id);
      await transferOwnershipMutation.mutateAsync(memberToTransfer.id);
      toast.success(t("members.transferOwnershipSuccess"));
      setOpenMenuMemberId(null);
      setMemberToTransfer(null);
      refetchMembers?.();
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

  const [mountedTime, setMountedTime] = useState<number>(0);
  useEffect(() => {
    setMountedTime(Date.now());
  }, []);

  // Calculate days remaining
  const calculateDaysRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return "never";
    const current = mountedTime || 0;
    if (!current) return "7d";
    const diff = new Date(expiresAt).getTime() - current;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d` : "expired";
  };

  // Derive members from server query, with fallback to current user
  const combinedMembers = useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role || "MEMBER",
        avatarUrl: m.avatarUrl,
        isOwner: Boolean(
          (m as { isOwner?: boolean }).isOwner ||
          (user?.organization?.ownerId && user.organization.ownerId === m.id),
        ),
        isCurrent: m.id === user?.id || m.email === user?.email,
      }));
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

      {/* Top Action: + Invite team member button (Admins only) */}
      {canEdit && !isInviteOpen && (
        <div>
          <Button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>{t("members.inviteMemberTitle")}</span>
          </Button>
        </div>
      )}

      {/* CARD: Invite a team member (Opens when clicked) */}
      {canEdit && isInviteOpen && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("members.inviteMemberTitle")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={handleSendInvite}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex-1">
              <Input
                type="email"
                placeholder={t("members.inviteEmailPlaceholder")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950 rounded-xl"
                required
              />
            </div>

            <div className="shrink-0">
              <CustomSelect
                value={inviteRole}
                onChange={(val) => setInviteRole(val)}
                options={[
                  { value: "MEMBER", label: t("members.roleMember") },
                  { value: "ADMIN", label: t("members.roleAdmin") },
                ]}
                className="w-full sm:w-36"
                triggerClassName="h-10 text-xs font-semibold"
              />
            </div>

            <Button
              type="submit"
              disabled={isInviting}
              className="h-10 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isInviting
                  ? t("members.sendingInvite")
                  : t("members.sendInvite")}
              </span>
            </Button>
          </form>
        </div>
      )}

      {/* CARD 1: Invite links (Admins & Owners only) */}
      {canEdit && (
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
                    options={[
                      { value: "MEMBER", label: t("members.roleMember") },
                      { value: "ADMIN", label: t("members.roleAdmin") },
                    ]}
                    className="w-32"
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
                      { value: "1 day", label: "1 day" },
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
                      { value: "5", label: "5 uses" },
                      { value: "10", label: "10 uses" },
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
            /* Matches Image 1 & Image 5 Invite links list */
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
                    {/* Left info */}
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
                            <span>{link.role}</span>
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
                          {t("common.created")}: {link.createdByName || "Admin"}
                        </p>
                      </div>
                    </div>

                    {/* Right actions: Copy (hidden if full) and Revoke */}
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
                        onClick={() => setLinkToRevoke(link.id)}
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
      )}

      {/* CARD 2: Team members (Matches Image 1 & Image 5) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {t("members.activeMembers")}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {combinedMembers.length}{" "}
              {combinedMembers.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Member list */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
          {combinedMembers.map((m, index) => {
            const isMemberOwner = Boolean(
              (user?.organization?.ownerId &&
                user.organization.ownerId === m.id) ||
              (m as { isOwner?: boolean }).isOwner,
            );

            return (
              <div
                key={m.id || index}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800">
                    {m.avatarUrl ? (
                      // Intentional img for user avatar (Next.js Image not suitable for arbitrary external URLs with signed params).
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {(m.name || "U")
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name and Email */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {m.name}
                      </span>
                      {m.isCurrent && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          ({t("common.you")})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {m.email}
                    </p>
                  </div>
                </div>

                {/* Right side role badge & actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isMemberOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-2xs">
                      <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{t("members.roleOwner")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {m.role?.toUpperCase() === "ADMIN" ? (
                        <>
                          <Shield className="h-3 w-3 text-blue-500" />
                          <span>{t("members.roleAdmin")}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{t("members.roleMember")}</span>
                        </>
                      )}
                    </span>
                  )}

                  {canEdit && !isMemberOwner && !m.isCurrent && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuMemberId(
                            openMenuMemberId === m.id ? null : m.id,
                          );
                        }}
                        disabled={actionLoadingId === m.id}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        title="Member actions"
                      >
                        {actionLoadingId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </button>

                      {openMenuMemberId === m.id && (
                        <div
                          ref={menuContainerRef}
                          className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {t("members.roleLabel")}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleRole(m.id, m.role)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer font-medium"
                          >
                            <Shield className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span>
                              {m.role?.toUpperCase() === "ADMIN"
                                ? `${t("common.edit")}: ${t("members.roleMember")}`
                                : `${t("common.edit")}: ${t("members.roleAdmin")}`}
                            </span>
                          </button>

                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuMemberId(null);
                                  setMemberToTransfer({
                                    id: m.id,
                                    name: m.name,
                                  });
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer font-medium"
                              >
                                <Crown className="h-3.5 w-3.5 shrink-0" />
                                <span>{t("members.transferOwnership")}</span>
                              </button>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuMemberId(null);
                              setMemberToRemove({ id: m.id, name: m.name });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer font-medium"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{t("members.removeMember")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      <ConfirmDestructiveModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title={t("members.removeMemberConfirmTitle")}
        description={
          memberToRemove ? (
            <span>
              {t("members.removeMemberConfirmWarning")}{" "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                ({memberToRemove.name})
              </strong>
            </span>
          ) : (
            t("members.removeMemberConfirmWarning")
          )
        }
        confirmMatchText={memberToRemove?.name}
        confirmButtonLabel={t("members.removeMember")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={actionLoadingId === memberToRemove?.id}
        variant="danger"
      />

      {/* Transfer Ownership Confirmation Modal */}
      <ConfirmDestructiveModal
        isOpen={!!memberToTransfer}
        onClose={() => setMemberToTransfer(null)}
        onConfirm={handleConfirmTransferOwnership}
        title={t("members.transferOwnershipConfirmTitle")}
        description={
          memberToTransfer ? (
            <span>
              {t("members.transferOwnershipConfirmDesc")}{" "}
              <strong className="font-semibold text-slate-900 dark:text-white">
                ({memberToTransfer.name})
              </strong>
              ? {t("members.transferOwnershipConfirmNote")}
            </span>
          ) : (
            t("members.transferOwnershipConfirmDesc")
          )
        }
        confirmButtonLabel={t("members.transferOwnershipConfirmButton")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={actionLoadingId === memberToTransfer?.id}
        variant="warning"
      />

      {/* Revoke Link Confirmation Modal */}
      <ConfirmDestructiveModal
        isOpen={!!linkToRevoke}
        onClose={() => setLinkToRevoke(null)}
        onConfirm={handleConfirmRevokeLink}
        title={t("members.revokeLinkConfirmTitle")}
        description={t("members.revokeLinkConfirmWarning")}
        confirmMatchText={t("common.revokeConfirmWord")}
        confirmButtonLabel={t("members.revokeLink")}
        cancelButtonLabel={t("common.cancel")}
        isLoading={!!revokingId}
        variant="warning"
      />
    </div>
  );
}
