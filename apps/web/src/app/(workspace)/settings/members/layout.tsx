"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Users, Mail, Link2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useOrgMembers, useInviteLinks } from "@/hooks/use-queries";
import { PageHeader, StatusState } from "@/components/shared";
import {
  SettingsSubTabs,
  type SettingsSubTabItem,
} from "@/components/settings/settings-sub-tabs";
import { partitionOrgInvites } from "@/components/settings/members/invite-format";

export default function MembersSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();
  const canManageMembers = useHasPermission("org:manage_members");

  const { data: members = [], isLoading: membersLoading } = useOrgMembers({
    enabled: canManageMembers,
  });
  const { data: serverInviteLinks = [], isLoading: linksLoading } =
    useInviteLinks({
      enabled: canManageMembers,
      includeRevoked: true,
    });

  const { activeEmailInvites, shareableLinks } = useMemo(
    () => partitionOrgInvites(serverInviteLinks),
    [serverInviteLinks],
  );

  const membersCount = !membersLoading
    ? members.length > 0
      ? members.length
      : user
        ? 1
        : 0
    : undefined;
  const activeEmailInviteCount = !linksLoading
    ? activeEmailInvites.length
    : undefined;
  const shareableLinksCount = !linksLoading ? shareableLinks.length : undefined;

  const tabs: SettingsSubTabItem[] = [
    {
      href: "/settings/members",
      label: t("members.tabMembers"),
      icon: Users,
      count: membersCount,
      isActive: pathname === "/settings/members",
    },
    {
      href: "/settings/members/invitations",
      label: t("members.tabEmailInvites"),
      icon: Mail,
      count: activeEmailInviteCount,
      isActive: pathname.startsWith("/settings/members/invitations"),
    },
    {
      href: "/settings/members/links",
      label: t("members.tabShareableLinks"),
      icon: Link2,
      count: shareableLinksCount,
      isActive: pathname.startsWith("/settings/members/links"),
    },
  ];

  return (
    <div className="flex flex-1 flex-col w-full space-y-6 animate-in fade-in duration-200 min-w-0">
      <PageHeader
        title={t("members.title")}
        subtitle={t("members.subtitle")}
        icon={Users}
        bordered
      />

      {!canManageMembers ? (
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/settings"
        />
      ) : (
        <>
          <SettingsSubTabs ariaLabel={t("members.title")} items={tabs} />
          {children}
        </>
      )}
    </div>
  );
}
