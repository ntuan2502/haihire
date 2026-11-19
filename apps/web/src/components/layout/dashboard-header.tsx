"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";

export interface WorkspaceBreadcrumbItem {
  label: string;
  href?: string;
}

const SETTINGS_SEGMENT_KEYS: Record<string, string> = {
  localization: "settings.tabs.localization",
  members: "settings.tabs.members",
  roles: "settings.tabs.roles",
  "audit-log": "settings.tabs.auditLog",
  integrations: "settings.tabs.integrations",
};

export function buildWorkspaceBreadcrumbs(
  pathname: string,
  t: (key: string) => string,
): WorkspaceBreadcrumbItem[] {
  const segments = pathname.split("?")[0]?.split("/").filter(Boolean) ?? [];
  const root = segments[0];

  if (root === "jobs") {
    if (segments.length === 1) {
      return [{ label: t("nav.jobs") }];
    }
    if (segments[1] === "new") {
      return [
        { label: t("nav.jobs"), href: "/jobs" },
        { label: t("nav.newJob") },
      ];
    }
    const subTab = segments[2];
    if (subTab === "table") {
      return [
        { label: t("nav.jobs"), href: "/jobs" },
        { label: t("jobs.tabs.table") },
      ];
    }
    if (subTab === "tracking") {
      return [
        { label: t("nav.jobs"), href: "/jobs" },
        { label: t("jobs.tabs.sourceTracking") },
      ];
    }
    if (subTab === "settings") {
      return [
        { label: t("nav.jobs"), href: "/jobs" },
        { label: t("jobs.tabs.settings") },
      ];
    }
    return [
      { label: t("nav.jobs"), href: "/jobs" },
      { label: t("jobs.tabs.pipeline") },
    ];
  }

  if (root === "candidates") {
    if (segments.length === 1) {
      return [{ label: t("nav.candidates") }];
    }
    if (segments[1] === "new") {
      return [
        { label: t("nav.candidates"), href: "/candidates" },
        { label: t("common.create") },
      ];
    }
    if (segments[2] === "edit") {
      return [
        { label: t("nav.candidates"), href: "/candidates" },
        { label: t("common.details"), href: `/candidates/${segments[1]}` },
        { label: t("common.edit") },
      ];
    }
    return [
      { label: t("nav.candidates"), href: "/candidates" },
      { label: t("common.details") },
    ];
  }

  if (root === "applications") {
    if (segments.length === 1) {
      return [{ label: t("nav.applications") }];
    }
    return [
      { label: t("nav.applications"), href: "/applications" },
      { label: t("common.details") },
    ];
  }

  if (root === "interviews") {
    return [{ label: t("nav.interviews") }];
  }

  if (root === "source-tracking") {
    if (segments.length === 1) {
      return [{ label: t("nav.features.sourceTracking") }];
    }
    return [
      { label: t("nav.features.sourceTracking"), href: "/source-tracking" },
      { label: t("common.details") },
    ];
  }

  if (root === "settings") {
    if (segments.length === 1) {
      return [
        { label: t("nav.settings"), href: "/settings" },
        { label: t("settings.tabs.general") },
      ];
    }
    const section = segments[1];
    if (section === "email-templates") {
      if (segments[2] === "settings") {
        return [
          { label: t("nav.settings"), href: "/settings" },
          {
            label: t("settings.tabs.emailTemplates"),
            href: "/settings/email-templates",
          },
          { label: t("email.tabSettings") },
        ];
      }
      if (segments[2] === "logs") {
        return [
          { label: t("nav.settings"), href: "/settings" },
          {
            label: t("settings.tabs.emailTemplates"),
            href: "/settings/email-templates",
          },
          { label: t("email.tabLogs") },
        ];
      }
      return [
        { label: t("nav.settings"), href: "/settings" },
        { label: t("settings.tabs.emailTemplates") },
      ];
    }

    const sectionKey = section ? SETTINGS_SEGMENT_KEYS[section] : undefined;
    if (sectionKey) {
      return [
        { label: t("nav.settings"), href: "/settings" },
        { label: t(sectionKey) },
      ];
    }
    return [{ label: t("nav.settings") }];
  }

  if (root === "account") {
    return [{ label: t("settings.tabs.account") }];
  }

  return [{ label: t("nav.dashboard") }];
}

export function DashboardHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const breadcrumbs = buildWorkspaceBreadcrumbs(pathname, t);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem
                    className={!isLast ? "hidden md:inline-flex" : "min-w-0"}
                  >
                    {!isLast && crumb.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="truncate font-medium">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isAuthenticated && user?.organizationId && (
          <NotificationBell
            organizationId={user.organizationId}
            userId={user.id}
          />
        )}
        <ThemeToggle />
        <LanguageDropdown />
      </div>
    </header>
  );
}
