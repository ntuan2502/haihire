"use client";

import { useState, type FormEvent } from "react";
import { Role } from "@haihire/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/custom-select";
import { UserPlus, X, Send } from "lucide-react";
import { useI18n } from "@/i18n";
import { getOrgRoleLabel, getOrgRoleOptions } from "@/lib/roles";

interface InviteMemberCardProps {
  canEdit: boolean;
  roleOptions?: CustomSelectOption<Role>[];
  getRoleLabel?: (role: string) => string;
  onInviteSuccess: (msg: string) => void;
  onInviteError: (msg: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function InviteMemberCard({
  canEdit,
  roleOptions,
  getRoleLabel,
  onInviteSuccess,
  onInviteError,
  isOpen,
  onOpenChange,
  hideTrigger = false,
}: InviteMemberCardProps) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);
  const [isInviting, setIsInviting] = useState(false);

  const resolvedOpen = isOpen ?? internalOpen;
  const setInviteOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
    } else {
      setInternalOpen(next);
    }
  };

  if (!canEdit) return null;

  const resolvedRoleOptions = roleOptions ?? getOrgRoleOptions(t);
  const resolveRoleLabel = (role: string) =>
    getRoleLabel ? getRoleLabel(role) : getOrgRoleLabel(role, t);

  const handleSendInvite = (e: FormEvent) => {
    e.preventDefault();

    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      onInviteError(t("members.inviteEmailRequired"));
      return;
    }

    setIsInviting(true);
    setTimeout(() => {
      setIsInviting(false);
      onInviteSuccess(
        t("members.inviteSentSuccess", {
          email: trimmedEmail,
          role: resolveRoleLabel(inviteRole),
        }),
      );
      setInviteEmail("");
    }, 500);
  };

  if (!resolvedOpen) {
    if (hideTrigger) {
      return null;
    }
    return (
      <div>
        <Button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          <span>{t("members.inviteMemberTitle")}</span>
        </Button>
      </div>
    );
  }

  return (
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
          onClick={() => setInviteOpen(false)}
          aria-label={t("common.close")}
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
            className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950 rounded-xl"
            required
          />
        </div>

        <div className="shrink-0">
          <CustomSelect
            value={inviteRole}
            onChange={(val) => setInviteRole(val)}
            options={resolvedRoleOptions}
            className="w-full sm:w-48"
            triggerClassName="h-9 text-xs font-semibold"
          />
        </div>

        <Button
          type="submit"
          disabled={isInviting}
          className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>
            {isInviting ? t("members.sendingInvite") : t("members.sendInvite")}
          </span>
        </Button>
      </form>
    </div>
  );
}
