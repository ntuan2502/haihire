"use client";

import { useContext } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { BadgeCheck, Bell, ChevronsUpDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocalization } from "@/components/providers/localization-provider";
import { useAuth } from "@/context/auth-context";
import { useNotificationsQuery } from "@/hooks/use-notification-queries";
import { useI18n } from "@/i18n";
import { getInitials, getUserDisplayName } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function NavUserUnreadBadge({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const { data } = useNotificationsQuery(organizationId, userId);
  const unread = data?.unreadCount ?? 0;
  if (unread <= 0) return null;

  return (
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary tabular-nums">
      {unread > 99 ? "99+" : unread}
    </span>
  );
}

export function NavUser() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();
  const { localization } = useLocalization();
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useContext(QueryClientContext) ?? null;

  const displayName = user
    ? getUserDisplayName(user, localization)
    : t("common.unknownUserFallback");
  const email = user?.email ?? "";
  const avatarUrl = user?.avatarUrl ?? undefined;
  const initials = getInitials(displayName);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              data-testid="user-menu-trigger"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => {
                  setOpenMobile(false);
                  router.push("/account");
                }}
              >
                <BadgeCheck />
                {t("settings.tabs.account")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setOpenMobile(false);
                  router.push("/notifications");
                }}
              >
                <Bell />
                <span>{t("settings.notifications")}</span>
                {queryClient && user?.organizationId && (
                  <NavUserUnreadBadge
                    organizationId={user.organizationId}
                    userId={user.id}
                  />
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setOpenMobile(false);
                void logout();
              }}
            >
              <LogOut />
              {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
