"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Sliders, History } from "lucide-react";
import { useI18n } from "@/i18n";

export default function EmailTemplatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const isTemplates = pathname === "/dashboard/settings/email-templates";
  const isSettings = pathname.startsWith("/dashboard/settings/email-templates/settings");
  const isLogs = pathname.startsWith("/dashboard/settings/email-templates/logs");

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
    <div className="w-full space-y-6 animate-in fade-in duration-200 min-w-0">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{t("email.templatesTitle")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("email.templatesSubtitle")}
        </p>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none max-w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                tab.isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
