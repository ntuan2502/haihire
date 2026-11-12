"use client";

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

export interface MemberItem {
  id: string;
  name: string;
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
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      {/* Member list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
        {members.map((m, index) => {
          const isMemberOwner = m.isOwner;

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
                {isMemberOwner && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-2xs">
                    <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>{t("members.roleOwner")}</span>
                  </span>
                )}

                {canManageMembers ? (
                  <div className="flex items-center gap-1.5">
                    {actionLoadingId === m.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
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
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Shield className="h-3 w-3 text-slate-400" />
                      <span>{getRoleLabel(m.role)}</span>
                    </span>
                  )
                )}

                {canEdit && !isMemberOwner && !m.isCurrent && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMenuChange(
                          openMenuMemberId === m.id ? null : m.id,
                        );
                      }}
                      disabled={actionLoadingId === m.id}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                      title={t("members.memberActionsTitle")}
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
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenMenuChange(null);
                                onTransferOwnershipClick({
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
                            onOpenMenuChange(null);
                            onRemoveMemberClick({ id: m.id, name: m.name });
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
  );
}
