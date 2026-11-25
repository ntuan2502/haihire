"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Mail, Sliders, History } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { PageHeader, StatusState } from "@/components/shared";
import { SettingsSubTabs } from "@/components/settings/settings-sub-tabs";

export default function EmailTemplatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();
  const canViewEmail = useHasPermission("email:view");

  const isTemplates = pathname === "/settings/email-templates";
  const isSettings = pathname.startsWith("/settings/email-templates/settings");
  const isLogs = pathname.startsWith("/settings/email-templates/logs");

  const tabs = [
    {
      href: "/settings/email-templates",
      label: t("email.tabTemplates"),
      icon: Mail,
      isActive: isTemplates,
    },
    {
      href: "/settings/email-templates/settings",
      label: t("email.tabSettings"),
      icon: Sliders,
      isActive: isSettings,
    },
    {
      href: "/settings/email-templates/logs",
      label: t("email.tabLogs"),
      icon: History,
      isActive: isLogs,
    },
  ];

  return (
    <div className="flex flex-1 flex-col w-full space-y-6 animate-in fade-in duration-200 min-w-0">
      <PageHeader
        title={t("email.templatesTitle")}
        subtitle={
          user?.organization?.name
            ? t("settings.tabs.emailTemplatesScope", {
                workspace: user.organization.name,
              })
            : t("email.templatesSubtitle")
        }
        icon={Mail}
        bordered
      />

      {!canViewEmail ? (
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/settings"
        />
      ) : (
        <>
          {/* Navigation Sub-Tabs */}
          <SettingsSubTabs ariaLabel={t("email.templatesTitle")} items={tabs} />

          {children}
        </>
      )}
    </div>
  );
}
