"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  Users,
} from "lucide-react";

import {
  NavMain,
  type NavMainItem,
  type NavMainSubItem,
} from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

function isPathMatch(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { t } = useI18n();

  const canViewJobs = useHasPermission("job:view");
  const canViewCandidates = useHasPermission("candidate:view");
  const canViewApplications = useHasPermission("application:view");
  const canViewInterviews = useHasPermission("interview:view");
  const canViewSourcing = useHasPermission("sourcing:view");

  const canViewGeneral = useHasPermission("org:view");
  const canViewEmailTemplates = useHasPermission("email:view");
  const canManageMembers = useHasPermission("org:manage_members");
  const canManageRoles = useHasPermission("org:manage_roles");
  const canViewAuditLog = useHasPermission("org:view_audit_log");
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );

  const settingsItems: NavMainSubItem[] = [
    ...(canViewGeneral
      ? [
          {
            id: "general",
            title: t("settings.tabs.general"),
            url: "/settings",
            isActive: pathname === "/settings",
          },
        ]
      : []),
    {
      id: "localization",
      title: t("settings.tabs.localization"),
      url: "/settings/localization",
      isActive: isPathMatch(pathname, "/settings/localization"),
    },
    ...(canViewEmailTemplates
      ? [
          {
            id: "email-templates",
            title: t("settings.tabs.emailTemplates"),
            url: "/settings/email-templates",
            isActive: isPathMatch(pathname, "/settings/email-templates"),
          },
        ]
      : []),
    ...(canManageMembers
      ? [
          {
            id: "members",
            title: t("settings.tabs.members"),
            url: "/settings/members",
            isActive: isPathMatch(pathname, "/settings/members"),
          },
        ]
      : []),
    ...(canManageRoles
      ? [
          {
            id: "roles",
            title: t("settings.tabs.roles"),
            url: "/settings/roles",
            isActive: isPathMatch(pathname, "/settings/roles"),
          },
        ]
      : []),
    ...(canViewAuditLog
      ? [
          {
            id: "audit-log",
            title: t("settings.tabs.auditLog"),
            url: "/settings/audit-log",
            isActive: isPathMatch(pathname, "/settings/audit-log"),
          },
        ]
      : []),
    ...(canManageIntegrations
      ? [
          {
            id: "integrations",
            title: t("settings.tabs.integrations"),
            url: "/settings/integrations",
            isActive: isPathMatch(pathname, "/settings/integrations"),
          },
        ]
      : []),
    {
      id: "notifications",
      title: t("settings.tabs.notifications"),
      url: "/settings/notifications",
      isActive: isPathMatch(pathname, "/settings/notifications"),
    },
    {
      id: "account",
      title: t("settings.tabs.account"),
      url: "/settings/account",
      isActive: isPathMatch(pathname, "/settings/account"),
    },
  ];

  const navItems: NavMainItem[] = [
    {
      id: "dashboard",
      title: t("nav.dashboard"),
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    ...(canViewJobs
      ? [
          {
            id: "jobs",
            title: t("nav.jobs"),
            url: "/jobs",
            icon: Briefcase,
            isActive: isPathMatch(pathname, "/jobs"),
          },
        ]
      : []),
    ...(canViewCandidates
      ? [
          {
            id: "candidates",
            title: t("nav.candidates"),
            url: "/candidates",
            icon: Users,
            isActive: isPathMatch(pathname, "/candidates"),
          },
        ]
      : []),
    ...(canViewApplications
      ? [
          {
            id: "applications",
            title: t("nav.applications"),
            url: "/applications",
            icon: FileText,
            isActive: isPathMatch(pathname, "/applications"),
          },
        ]
      : []),
    ...(canViewInterviews
      ? [
          {
            id: "interviews",
            title: t("nav.interviews"),
            url: "/interviews",
            icon: Calendar,
            isActive: isPathMatch(pathname, "/interviews"),
          },
        ]
      : []),
    ...(canViewSourcing
      ? [
          {
            id: "sourcing",
            title: t("nav.features.sourceTracking"),
            url: "/source-tracking",
            icon: Radio,
            isActive: isPathMatch(pathname, "/source-tracking"),
          },
        ]
      : []),
    {
      id: "settings",
      title: t("nav.settings"),
      url: settingsItems[0]?.url ?? "/settings",
      icon: Settings,
      isActive: isPathMatch(pathname, "/settings"),
      items: settingsItems,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={t("nav.navigationGroup")} items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
