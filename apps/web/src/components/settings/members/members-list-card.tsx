"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { useRef, useEffect } from "react";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/custom-select";
import { Role } from "@haihire/shared";
import {
  Users,
  Crown,
  Shield,
  MoreHorizontal,
  Loader2,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { getInitials, getUserDisplayName } from "@/lib/utils";

export interface MemberItem {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
  avatarUrl?: string | null;
  createdAt?: string;
  isOwner: boolean;
  isCurrent: boolean;
}

interface MembersListCardProps {
  members: MemberItem[];
  canManageMembers: boolean;
  canEdit: boolean;
  isOwner: boolean;
  currentUserId?: string;
  actionLoadingId: string | null;
  roleOptions: CustomSelectOption<Role>[];
  getRoleLabel: (role: string) => string;
  openMenuMemberId: string | null;
  onOpenMenuChange: (id: string | null) => void;
  onRoleChange: (memberId: string, role: Role) => void;
  onTransferOwnershipClick: (member: { id: string; name: string }) => void;
  onRemoveMemberClick: (member: { id: string; name: string }) => void;
}

export function MembersListCard({
  members,
  canManageMembers,
  canEdit,
  isOwner,
  currentUserId,
  actionLoadingId,
  roleOptions,
  getRoleLabel,
  openMenuMemberId,
  onOpenMenuChange,
  onRoleChange,
  onTransferOwnershipClick,
  onRemoveMemberClick,
}: MembersListCardProps) {
  const { t } = useI18n();
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
      onOpenMenuChange(null);
    };
    if (openMenuMemberId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openMenuMemberId, onOpenMenuChange]);

  return (
    <SettingsCard className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
          <Users className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-foreground">
            {t("members.activeMembers")}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {members.length === 1
              ? t("members.memberCountOne", { count: members.length })
              : t("members.memberCountOther", { count: members.length })}
          </p>
        </div>
      </div>

      {/* Member list */}
      <div className="divide-y divide-border pt-1">
        {members.map((m, index) => {
          const isMemberOwner = m.isOwner;
          const displayName = getUserDisplayName(m);

          return (
            <div
              key={m.id || index}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground font-semibold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border">
                  {m.avatarUrl ? (
                    // Intentional img for user avatar (Next.js Image not suitable for arbitrary external URLs with signed params).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(displayName)}</span>
                  )}
                </div>

                {/* Name and Email */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {displayName}
                    </span>
                    {m.isCurrent && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        ({t("common.you")})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {m.email}
                  </p>
                </div>
              </div>

              {/* Right side role badge & actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isMemberOwner && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Crown
                      className="h-3 w-3 text-amber-500 fill-amber-500"
                      aria-hidden="true"
                    />
                    <span>{t("members.roleOwner")}</span>
                  </span>
                )}

                {canManageMembers ? (
                  <div className="flex items-center gap-1.5">
                    {actionLoadingId === m.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    <CustomSelect<Role>
                      value={(m.role?.toUpperCase() as Role) || Role.MEMBER}
                      onChange={(newRole) => onRoleChange(m.id, newRole)}
                      options={roleOptions}
                      disabled={
                        isMemberOwner ||
                        m.isCurrent ||
                        currentUserId === m.id ||
                        actionLoadingId === m.id
                      }
                      size="sm"
                      aria-label={t("members.roleLabel")}
                      className="w-36"
                    />
                  </div>
                ) : (
                  !isMemberOwner && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      <Shield
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>{getRoleLabel(m.role)}</span>
                    </span>
                  )
                )}

                {canEdit && !isMemberOwner && !m.isCurrent && (
                  <div className="relative">
                    <SettingsButton
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMenuChange(
                          openMenuMemberId === m.id ? null : m.id,
                        );
                      }}
                      disabled={actionLoadingId === m.id}
                      title={t("members.memberActionsTitle")}
                      aria-label={t("members.memberActionsTitle")}
                    >
                      {actionLoadingId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </SettingsButton>

                    {openMenuMemberId === m.id && (
                      <div
                        ref={menuContainerRef}
                        className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md z-30 animate-in fade-in zoom-in-95 duration-100"
                      >
                        {isOwner && (
                          <>
                            <SettingsButton
                              variant="ghost"
                              type="button"
                              onClick={() => {
                                onOpenMenuChange(null);
                                onTransferOwnershipClick({
                                  id: m.id,
                                  name: m.name,
                                });
                              }}
                              className="w-full justify-start rounded-md px-2.5 font-medium"
                            >
                              <Crown className="h-3.5 w-3.5 shrink-0" />
                              <span>{t("members.transferOwnership")}</span>
                            </SettingsButton>
                            <div className="my-1 border-t border-border" />
                          </>
                        )}

                        <SettingsButton
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            onOpenMenuChange(null);
                            onRemoveMemberClick({ id: m.id, name: m.name });
                          }}
                          className="w-full justify-start rounded-md px-2.5 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{t("members.removeMember")}</span>
                        </SettingsButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}
