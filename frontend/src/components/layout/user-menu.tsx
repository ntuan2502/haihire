"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Check,
  Plus,
  Settings,
  Sparkles,
  MessageSquareWarning,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useMyOrgs, useSwitchOrgMutation } from "@/hooks/use-queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import { getInitials } from "@/lib/utils";

export interface UserMenuProps {
  className?: string;
  showOrgSwitcher?: boolean;
}

export function UserMenu({ className, showOrgSwitcher = true }: UserMenuProps) {
  const router = useRouter();
  const { user, logout, isOwner, isAdmin } = useAuth();
  const { t } = useI18n();
  const { data: myOrgs = [] } = useMyOrgs();
  const switchOrgMutation = useSwitchOrgMutation();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-800 transition-all cursor-pointer outline-none select-none",
          className,
        )}
        aria-label="User Profile"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
          {getInitials(user.name)}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-68 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-1 z-50 text-slate-800 dark:text-slate-200 overflow-visible"
      >
        {/* User Full Name, Email, Role Badge */}
        <div className="px-2 pt-1 pb-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
              {user.name}
            </span>
            {user.organizationId && (
              <>
                {isOwner ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                    {t("members.roleOwner")}
                  </span>
                ) : isAdmin ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-md border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                    {t("members.roleAdmin")}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                    {t("members.roleMember")}
                  </span>
                )}
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
            {user.email}
          </span>
        </div>

        {/* Organization Selector Box with Dropdown */}
        {showOrgSwitcher && (
          <div className="w-full my-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden transition-all">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOrgDropdownOpen(!isOrgDropdownOpen);
              }}
              aria-expanded={isOrgDropdownOpen}
              aria-label={user.organization?.name || t("nav.noOrganization")}
              className="w-full text-left p-2 flex items-center justify-between hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2
                  className="h-3.5 w-3.5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {user.organization?.name || t("nav.noOrganization")}
                </span>
              </div>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-3 w-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0",
                  isOrgDropdownOpen && "rotate-180",
                )}
              />
            </button>

            {/* Expanded Organization List */}
            {isOrgDropdownOpen && (
              <div className="border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto">
                {myOrgs.length > 0 ? (
                  myOrgs.map((org) => {
                    const isActive = org.id === user.organizationId;
                    return (
                      <button
                        type="button"
                        key={org.id}
                        role="menuitem"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!isActive) {
                            try {
                              await switchOrgMutation.mutateAsync(org.id);
                              router.push("/dashboard");
                            } catch (err) {
                              console.error("Failed to switch workspace:", err);
                            }
                          }
                          setIsOrgDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          isActive
                            ? "bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold cursor-default"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        )}
                      >
                        <span className="truncate">{org.name}</span>
                        {isActive && (
                          <Check
                            className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })
                ) : user.organization ? (
                  <div className="w-full px-2.5 py-1.5 flex items-center justify-between text-xs bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold cursor-default">
                    <span className="truncate">{user.organization.name}</span>
                    <Check
                      className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                ) : null}

                {/* + Create organization item */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOrgDropdownOpen(false);
                    router.push("/auth/onboarding?mode=create");
                  }}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  <span>{t("nav.createOrganization")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings (if user belongs to an org) */}
        {user.organizationId && (
          <button
            type="button"
            role="menuitem"
            onClick={() => router.push("/dashboard/settings")}
            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>{t("nav.settings")}</span>
          </button>
        )}

        {/* Updates & changelog (Coming Soon) */}
        <div
          aria-disabled="true"
          className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed select-none"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-slate-400" />
            <span>{t("nav.updatesChangelog")}</span>
          </div>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
            {t("common.soon")}
          </span>
        </div>

        {/* Report issue (Coming Soon) */}
        <div
          aria-disabled="true"
          className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed select-none"
        >
          <div className="flex items-center gap-2.5">
            <MessageSquareWarning className="h-4 w-4 text-slate-400" />
            <span>{t("nav.reportIssue")}</span>
          </div>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
            {t("common.soon")}
          </span>
        </div>

        {/* Divider */}
        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

        {/* Sign out */}
        <button
          type="button"
          role="menuitem"
          onClick={logout}
          className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>{t("nav.signOut")}</span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
