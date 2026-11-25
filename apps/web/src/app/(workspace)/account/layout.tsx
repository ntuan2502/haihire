"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Bell, Shield, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/shared";
import {
  SettingsSubTabs,
  type SettingsSubTabItem,
} from "@/components/settings/settings-sub-tabs";
import { useUserSessionsQuery } from "@/hooks/use-account-security";
import { useI18n } from "@/i18n";

export default function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: sessions } = useUserSessionsQuery();

  const tabs: SettingsSubTabItem[] = [
    {
      href: "/account",
      label: t("settings.tabs.accountProfile"),
      icon: UserIcon,
      isActive: pathname === "/account",
    },
    {
      href: "/account/security",
      label: t("settings.tabs.accountSecurity"),
      icon: Shield,
      count: sessions ? sessions.length : undefined,
      isActive: pathname.startsWith("/account/security"),
    },
    {
      href: "/account/notifications",
      label: t("settings.tabs.accountNotifications"),
      icon: Bell,
      isActive: pathname.startsWith("/account/notifications"),
    },
  ];

  return (
    <div
      data-testid="account-shell"
      className="flex flex-1 flex-col bg-background"
    >
      <section
        data-testid="account-content"
        className="w-full flex-1 min-w-0 p-4 sm:p-6 space-y-6 animate-in fade-in duration-200"
      >
        <PageHeader
          title={t("settings.tabs.account")}
          subtitle={t("settings.accountProfileDesc")}
          icon={UserIcon}
          bordered
        />

        <SettingsSubTabs ariaLabel={t("settings.tabs.account")} items={tabs} />

        {children}
      </section>
    </div>
  );
}
