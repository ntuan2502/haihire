"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { useState, type FormEvent } from "react";
import { Role } from "@haihire/shared";
import { Input } from "@/components/ui/input";
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
        <SettingsButton
          type="button"
          onClick={() => setInviteOpen(true)}
          icon={UserPlus}
        >
          {t("members.inviteMemberTitle")}
        </SettingsButton>
      </div>
    );
  }

  return (
    <SettingsCard className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-foreground" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-foreground">
            {t("members.inviteMemberTitle")}
          </h3>
        </div>
        <SettingsButton
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={() => setInviteOpen(false)}
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </SettingsButton>
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
            className="text-xs"
            required
          />
        </div>

        <div className="shrink-0">
          <CustomSelect
            value={inviteRole}
            onChange={(val) => setInviteRole(val)}
            options={resolvedRoleOptions}
            className="w-full sm:w-48"
            triggerClassName="text-xs font-medium"
          />
        </div>

        <SettingsButton
          type="submit"
          icon={Send}
          pending={isInviting}
          disabled={isInviting}
          className="h-9 shrink-0"
        >
          {isInviting ? t("members.sendingInvite") : t("members.sendInvite")}
        </SettingsButton>
      </form>
    </SettingsCard>
  );
}
