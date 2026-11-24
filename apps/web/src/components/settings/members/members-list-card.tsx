"use client";

import { useMemo, useState } from "react";
import { SettingsButton } from "@/components/settings/settings-button";
import { SettingsCard } from "@/components/settings/settings-card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/custom-select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Role } from "@haihire/shared";
import {
  Users,
  Crown,
  Shield,
  MoreHorizontal,
  Loader2,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { formatDate, getUserDisplayName } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";

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

type RoleFilterValue = Role | "ALL";

interface MembersListCardProps {
  members: MemberItem[];
  isLoading?: boolean;
  canManageMembers: boolean;
  canEdit: boolean;
  isOwner: boolean;
  canManageAdminTargets?: boolean;
  currentUserId?: string;
  actionLoadingId: string | null;
  roleOptions: CustomSelectOption<Role>[];
  filterRoleOptions?: CustomSelectOption<Role>[];
  getRoleLabel: (role: string) => string;
  onRoleChange: (memberId: string, role: Role) => void;
  onTransferOwnershipClick: (member: { id: string; name: string }) => void;
  onRemoveMemberClick: (member: { id: string; name: string }) => void;
}

export function MembersListCard({
  members,
  isLoading = false,
  canManageMembers,
  canEdit,
  isOwner,
  canManageAdminTargets = true,
  currentUserId,
  actionLoadingId,
  roleOptions,
  filterRoleOptions,
  getRoleLabel,
  onRoleChange,
  onTransferOwnershipClick,
  onRemoveMemberClick,
}: MembersListCardProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("ALL");

  const resolvedFilterRoleOptions = filterRoleOptions ?? roleOptions;
  const roleFilterSelectOptions = useMemo<
    CustomSelectOption<RoleFilterValue>[]
  >(
    () => [
      { value: "ALL", label: t("members.allRoles") },
      ...resolvedFilterRoleOptions,
    ],
    [t, resolvedFilterRoleOptions],
  );

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const displayName = getUserDisplayName(m, localization).toLowerCase();
      const rawName = (m.name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const matchesSearch =
        !query ||
        displayName.includes(query) ||
        rawName.includes(query) ||
        email.includes(query);
      const normalizedRole = (m.role?.toUpperCase() as Role) || Role.MEMBER;
      const matchesRole = roleFilter === "ALL" || normalizedRole === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter, localization]);

  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground shrink-0">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              {t("members.activeMembers")}
            </h3>
            {!isLoading && (
              <p className="text-[11px] text-muted-foreground">
                {members.length === 1
                  ? t("members.memberCountOne", { count: members.length })
                  : t("members.memberCountOther", { count: members.length })}
              </p>
            )}
          </div>
        </div>

        {!isLoading && members.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative sm:w-56">
              <Search
                className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("members.searchPlaceholder")}
                aria-label={t("members.searchPlaceholder")}
                className="h-8 pl-8 pr-7 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label={t("common.clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <CustomSelect<RoleFilterValue>
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={roleFilterSelectOptions}
              size="sm"
              aria-label={t("members.filterByRole")}
              className="w-full sm:w-40"
            />
          </div>
        )}
      </div>

      {/* Member list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filteredMembers.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {members.length > 0
            ? t("members.noMatchingMembers")
            : t("common.noData")}
        </div>
      ) : (
        <div className="divide-y divide-border pt-1">
          {filteredMembers.map((m, index) => {
            const isMemberOwner = m.isOwner;
            const displayName = getUserDisplayName(m, localization);
            const normalizedRole =
              (m.role?.toUpperCase() as Role) || Role.MEMBER;
            const isProtectedAdminTarget =
              !canManageAdminTargets && normalizedRole === Role.ADMIN;
            const isRoleLocked =
              isMemberOwner ||
              m.isCurrent ||
              currentUserId === m.id ||
              isProtectedAdminTarget;

            return (
              <div
                key={m.id || index}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <UserAvatar
                    name={displayName}
                    avatarUrl={m.avatarUrl}
                    size="md"
                    rounded="full"
                  />

                  {/* Name, Email and Join Date */}
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
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="truncate">{m.email}</span>
                      {m.createdAt && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span>
                            {t("members.joinedOn", {
                              date: formatDate(
                                m.createdAt,
                                "numeric",
                                localization,
                              ),
                            })}
                          </span>
                        </>
                      )}
                    </div>
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
                        value={normalizedRole}
                        onChange={(newRole) => onRoleChange(m.id, newRole)}
                        options={
                          isProtectedAdminTarget
                            ? resolvedFilterRoleOptions
                            : roleOptions
                        }
                        disabled={isRoleLocked || actionLoadingId === m.id}
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

                  {canEdit &&
                    !isMemberOwner &&
                    !m.isCurrent &&
                    !isProtectedAdminTarget && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SettingsButton
                            variant="ghost"
                            size="icon-sm"
                            type="button"
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
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48">
                          {isOwner && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  onTransferOwnershipClick({
                                    id: m.id,
                                    name: displayName,
                                  })
                                }
                                className="gap-2 text-xs font-medium cursor-pointer"
                              >
                                <Crown className="h-3.5 w-3.5 shrink-0" />
                                <span>{t("members.transferOwnership")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              onRemoveMemberClick({
                                id: m.id,
                                name: displayName,
                              })
                            }
                            className="gap-2 text-xs font-medium cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{t("members.removeMember")}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
