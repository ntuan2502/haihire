"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Sliders, History } from "lucide-react";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { PageHeader, StatusState } from "@/components/shared";

export default function EmailTemplatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const canViewEmail = useHasPermission("email:view");

  const isTemplates = pathname === "/dashboard/settings/email-templates";
  const isSettings = pathname.startsWith(
    "/dashboard/settings/email-templates/settings",
  );
  const isLogs = pathname.startsWith(
    "/dashboard/settings/email-templates/logs",
  );

  const tabs = [
    {
      href: "/dashboard/settings/email-templates",
      label: t("email.tabTemplates"),
      icon: Mail,
      isActive: isTemplates,
    },
    {
      href: "/dashboard/settings/email-templates/settings",
      label: t("email.tabSettings"),
      icon: Sliders,
      isActive: isSettings,
    },
    {
      href: "/dashboard/settings/email-templates/logs",
      label: t("email.tabLogs"),
      icon: History,
      isActive: isLogs,
    },
  ];

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200 min-w-0">
      <PageHeader
        title={t("email.templatesTitle")}
        subtitle={t("email.templatesSubtitle")}
        icon={Mail}
        bordered
      />

      {!canViewEmail ? (
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/dashboard/settings"
        />
      ) : (
        <>
          {/* Navigation Sub-Tabs */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none max-w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    tab.isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>

          {children}
        </>
      )}
    </div>
  );
}
