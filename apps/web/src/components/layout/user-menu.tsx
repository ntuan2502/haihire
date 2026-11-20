"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Check,
  Plus,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useAuth } from "@/context/auth-context";
import { useMyOrgs, useSwitchOrgMutation } from "@/hooks/use-queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/i18n";
import { cn } from "cn";
import { getInitials, getUserDisplayName } from "@/lib/utils";
import { getOrgRoleBadgeClass, getOrgRoleLabel } from "@/lib/roles";

export interface UserMenuProps {
  className?: string;
  showOrgSwitcher?: boolean;
}

export function UserMenu({ className, showOrgSwitcher = true }: UserMenuProps) {
  const router = useRouter();
  const { user, logout, isOwner } = useAuth();
  const { t } = useI18n();
  const { data: myOrgs = [] } = useMyOrgs({ enabled: Boolean(user) });
  const switchOrgMutation = useSwitchOrgMutation();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  if (!user) return null;

  const displayRole = isOwner ? "OWNER" : user.role;
  const displayName = getUserDisplayName(user);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setIsOrgDropdownOpen(false);
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          "flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-ring/30 focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer outline-none select-none",
          className,
        )}
        aria-label={t("common.userProfile")}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs">
          {getInitials(displayName)}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-68 p-2.5 rounded-xl bg-popover text-popover-foreground border border-border shadow-2xl space-y-1"
      >
        {/* User Full Name, Email, Role Badge */}
        <div className="px-2 pt-1 pb-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-bold text-xs text-foreground block truncate">
              {displayName}
            </span>
            {user.organizationId && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-semibold rounded-md border shrink-0",
                  getOrgRoleBadgeClass(displayRole),
                )}
              >
                {getOrgRoleLabel(displayRole, t)}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
            {user.email}
          </span>
        </div>

        {/* Organization Selector Box with Dropdown */}
        {showOrgSwitcher && (
          <div className="w-full my-1 rounded-lg bg-muted/50 border border-border overflow-hidden transition-all">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOrgDropdownOpen(!isOrgDropdownOpen);
              }}
              aria-expanded={isOrgDropdownOpen}
              aria-label={user.organization?.name || t("nav.noOrganization")}
              className="w-full text-left p-2 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <OrganizationLogo
                  name={user.organization?.name}
                  logoUrl={user.organization?.logoUrl}
                  size="xs"
                  decorative
                />
                <span className="text-xs font-semibold text-foreground truncate">
                  {user.organization?.name || t("nav.noOrganization")}
                </span>
              </div>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0",
                  isOrgDropdownOpen && "rotate-180",
                )}
              />
            </button>

            {/* Expanded Organization List */}
            {isOrgDropdownOpen && (
              <div className="border-t border-border bg-popover divide-y divide-border max-h-48 overflow-y-auto">
                {myOrgs.length > 0 ? (
                  myOrgs.map((org) => {
                    const isActive = org.id === user.organizationId;
                    return (
                      <DropdownMenuItem key={org.id} asChild>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!isActive) {
                              try {
                                await switchOrgMutation.mutateAsync(org.id);
                                router.push("/dashboard");
                              } catch (err) {
                                toast.error(getApiErrorMessage(err, t));
                              }
                            }
                            setIsOrgDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs rounded-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold cursor-default"
                              : "text-foreground hover:bg-accent",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <OrganizationLogo
                              name={org.name}
                              logoUrl={org.logoUrl}
                              size="xs"
                              decorative
                            />
                            <span className="truncate">{org.name}</span>
                          </div>
                          {isActive && (
                            <Check
                              className="h-3.5 w-3.5 text-primary shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </DropdownMenuItem>
                    );
                  })
                ) : user.organization ? (
                  <div className="w-full px-2.5 py-1.5 flex items-center justify-between text-xs bg-primary/10 text-primary font-semibold cursor-default">
                    <div className="flex items-center gap-2 min-w-0">
                      <OrganizationLogo
                        name={user.organization.name}
                        logoUrl={user.organization.logoUrl}
                        size="xs"
                        decorative
                      />
                      <span className="truncate">{user.organization.name}</span>
                    </div>
                    <Check
                      className="h-3.5 w-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                ) : null}

                {/* + Create organization item */}
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOrgDropdownOpen(false);
                      router.push("/auth/onboarding?mode=create");
                    }}
                    className="w-full text-left px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    <span>{t("nav.createOrganization")}</span>
                  </button>
                </DropdownMenuItem>
              </div>
            )}
          </div>
        )}

        {/* Personal Account */}
        <DropdownMenuItem asChild>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <User
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{t("settings.tabs.account")}</span>
          </button>
        </DropdownMenuItem>

        {/* Notifications (if user belongs to an org) */}
        {user.organizationId && (
          <DropdownMenuItem asChild>
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{t("settings.notifications")}</span>
            </button>
          </DropdownMenuItem>
        )}

        {/* Settings (if user belongs to an org) */}
        {user.organizationId && (
          <DropdownMenuItem asChild>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{t("nav.settings")}</span>
            </button>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem asChild variant="destructive">
          <button
            type="button"
            onClick={logout}
            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t("nav.signOut")}</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
