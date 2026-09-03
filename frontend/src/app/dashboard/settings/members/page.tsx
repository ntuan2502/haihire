"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import {
  useOrgMembers,
  useInviteLinks,
  useCreateInviteLinkMutation,
  useRevokeInviteLinkMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  RotateCcw,
  Shield,
  Trash2,
  Loader2,
} from "lucide-react";
import type { InviteLink } from "@/types";

export default function MembersSettingsPage() {
  const { user } = useAuth();
  const { data: members = [], refetch: refetchMembers } = useOrgMembers();
  const { data: serverInviteLinks = [], refetch: refetchLinks } = useInviteLinks();
  const createInviteMutation = useCreateInviteLinkMutation();
  const revokeInviteMutation = useRevokeInviteLinkMutation();

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
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // State for "New invite link" card
  const [isCreateLinkOpen, setIsCreateLinkOpen] = useState(false);
  const [linkRole, setLinkRole] = useState("Member");
  const [linkExpiresIn, setLinkExpiresIn] = useState("7 days");
  const [linkMaxUses, setLinkMaxUses] = useState("1");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Simulated members for demo testing (persisted in localStorage for convenience)
  const [localMembers, setLocalMembers] = useState<
    { id: string; name: string; email: string; role: string; avatarColor?: string }[]
  >([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ats_demo_accepted_members");
      if (saved) {
        setLocalMembers(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle sending email invite
  const handleSendInvite = (e: React.FormEvent) => {
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
      setInviteErrorMsg("Failed to create invite link.");
    }
  };

  // Handle copying link
  const handleCopyLink = (link: InviteLink) => {
    const fullUrl = `http://${displayHost}/join/${link.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Handle revoking link
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const handleRevokeLink = async (id: string) => {
    try {
      setRevokingId(id);
      await revokeInviteMutation.mutateAsync(id);
      await refetchLinks();
    } catch (err) {
      console.error(err);
      setInviteErrorMsg("Failed to revoke invite link.");
    } finally {
      setRevokingId(null);
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

  // Combine server members + local demo members
  const combinedMembers = React.useMemo(() => {
    const base: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl?: string | null;
      avatarColor?: string;
      isCurrent?: boolean;
    }[] = [];

    if (members && members.length > 0) {
      members.forEach((m) => {
        base.push({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role || "ADMIN",
          avatarUrl: m.avatarUrl,
          isCurrent: m.id === user?.id || m.email === user?.email,
        });
      });
    } else if (user) {
      base.push({
        id: user.id,
        name: user.name || "Nguyễn Anh Tuấn",
        email: user.email || "ntuan.2502@gmail.com",
        role: "ADMIN",
        avatarUrl: user.avatarUrl,
        isCurrent: true,
      });
    }

    // Append any extra local accepted members
    localMembers.forEach((lm) => {
      if (!base.some((b) => b.email === lm.email)) {
        base.push({
          id: lm.id,
          name: lm.name,
          email: lm.email,
          role: lm.role,
          avatarColor: lm.avatarColor || "bg-rose-500",
          isCurrent: false,
        });
      }
    });

    return base;
  }, [members, user, localMembers]);

  // Quick simulate accepted invite (adds "Tuan Nguyen" as shown in Image 5)
  const handleAddDemoAcceptedMember = () => {
    const newMember = {
      id: `demo_${Date.now()}`,
      name: "Tuan Nguyen",
      email: "anhtuan.amata@gmail.com",
      role: "Member",
      avatarColor: "bg-rose-500",
    };
    const updated = [...localMembers, newMember];
    setLocalMembers(updated);
    localStorage.setItem("ats_demo_accepted_members", JSON.stringify(updated));
  };

  const handleResetDemoMembers = () => {
    setLocalMembers([]);
    localStorage.removeItem("ats_demo_accepted_members");
    refetchMembers();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Members
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your team members and invitations.
          </p>
        </div>

        {/* Demo preview helper for simulating accepted member */}
        <div className="flex items-center gap-2">
          {localMembers.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDemoAcceptedMember}
              className="text-[11px] h-7 text-slate-500 border-dashed"
            >
              + Preview with accepted member (Image 5)
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDemoMembers}
              className="text-[11px] h-7 text-slate-400 hover:text-slate-600 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset members</span>
            </Button>
          )}
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

      {/* Top Action: + Invite team member button */}
      {!isInviteOpen && (
        <div>
          <Button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite team member</span>
          </Button>
        </div>
      )}

      {/* CARD: Invite a team member (Opens when clicked) */}
      {isInviteOpen && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Invite a team member
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
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950 rounded-xl"
                required
              />
            </div>

            <div className="shrink-0">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full sm:w-auto h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
                <option value="Interviewer">Interviewer</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isInviting}
              className="h-10 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isInviting ? "Sending..." : "Send invite"}</span>
            </Button>
          </form>
        </div>
      )}

      {/* CARD 1: Invite links */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Invite links
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Shareable links to join your organization
              </p>
            </div>
          </div>

          {!isCreateLinkOpen && (
            <Button
              type="button"
              onClick={() => setIsCreateLinkOpen(true)}
              className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Create link</span>
            </Button>
          )}
        </div>

        {/* Section: New invite link (When Create link is clicked) */}
        {isCreateLinkOpen && (
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                New invite link
              </span>
              <button
                type="button"
                onClick={() => setIsCreateLinkOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Role
                </label>
                <select
                  value={linkRole}
                  onChange={(e) => setLinkRole(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                  <option value="Interviewer">Interviewer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Expires in
                </label>
                <select
                  value={linkExpiresIn}
                  onChange={(e) => setLinkExpiresIn(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="1 day">1 day</option>
                  <option value="7 days">7 days</option>
                  <option value="30 days">30 days</option>
                  <option value="Never">Never</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Max uses (optional)
                </label>
                <select
                  value={linkMaxUses}
                  onChange={(e) => setLinkMaxUses(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="1">1 use</option>
                  <option value="5">5 uses</option>
                  <option value="10">10 uses</option>
                  <option value="Unlimited">Unlimited</option>
                </select>
              </div>

              <div>
                <Button
                  type="button"
                  disabled={createInviteMutation.isPending}
                  onClick={handleCreateLink}
                  className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Invite links list / empty state */}
        {serverInviteLinks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            No active invite links. Create one to share with your team.
          </div>
        ) : (
          /* Matches Image 1 & Image 5 Invite links list */
          <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
            {serverInviteLinks.map((link) => {
              const isCopied = copiedLinkId === link.id;
              const isFull =
                link.maxUses !== null && link.usesCount >= link.maxUses;
              const isInactive = link.status !== "active" || isFull;

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
                            Inactive
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {link.usesCount}/{link.maxUses !== null ? link.maxUses : "∞"} uses
                        {" • "}Expires in {daysRemaining}
                        {" • "}by {link.createdByName || "Admin"}
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
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={revokingId === link.id}
                      onClick={() => handleRevokeLink(link.id)}
                      className="h-8 text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      {revokingId === link.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Revoke</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CARD 2: Team members (Matches Image 1 & Image 5) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Team members
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
            const isOwner = index === 0;

            return (
              <div
                key={m.id || index}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className={`h-9 w-9 rounded-full ${
                      m.avatarColor || "bg-slate-800 dark:bg-slate-700"
                    } text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800`}
                  >
                    {m.avatarUrl ? (
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
                          (you)
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
                  {isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-2xs">
                      <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>Owner</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {m.role || "Member"}
                    </span>
                  )}

                  {!isOwner && (
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
