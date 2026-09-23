"use client";

import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Building2,
  Globe,
  Bell,
  AppWindow,
  Users,
  CreditCard,
  Plug,
  Bot,
  Clock,
  ShieldCheck,
  User as UserIcon,
  Lock,
  Mail,
} from "lucide-react";
import { cn } from "cn";
import { useI18n } from "@/i18n";

interface NavItem {
  id: string;
  href: string;
  label: string;
  sublabel: string;
  icon: ElementType;
  locked?: boolean;
  beta?: boolean;
}

const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    id: "general",
    href: "/dashboard/settings",
    label: "General",
    sublabel: "Organization profile",
    icon: Building2,
  },
  {
    id: "localization",
    href: "/dashboard/settings/localization",
    label: "Localization",
    sublabel: "Names & date formats",
    icon: Globe,
  },
  {
    id: "notifications",
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    sublabel: "Email alerts & digest",
    icon: Bell,
  },
  {
    id: "career-page",
    href: "/dashboard/settings/career-page",
    label: "Career Page",
    sublabel: "Branded public page",
    icon: AppWindow,
  },
  {
    id: "email-templates",
    href: "/dashboard/settings/email-templates",
    label: "Email Templates",
    sublabel: "Templates & SMTP",
    icon: Mail,
  },
  {
    id: "members",
    href: "/dashboard/settings/members",
    label: "Members",
    sublabel: "Team & invitations",
    icon: Users,
  },
  {
    id: "billing",
    href: "/dashboard/settings/billing",
    label: "Billing",
    sublabel: "Plan & payment",
    icon: CreditCard,
  },
  {
    id: "integrations",
    href: "/dashboard/settings/integrations",
    label: "Integrations",
    sublabel: "Calendar & services",
    icon: Plug,
    locked: true,
  },
  {
    id: "ai-configuration",
    href: "/dashboard/settings/ai-configuration",
    label: "AI Configuration",
    sublabel: "Models & API keys",
    icon: Bot,
    locked: true,
  },
  {
    id: "privacy-retention",
    href: "/dashboard/settings/privacy-retention",
    label: "Privacy & Retent...",
    sublabel: "Retention policy",
    icon: Clock,
    locked: true,
  },
  {
    id: "sso",
    href: "/dashboard/settings/sso",
    label: "Single Sig...",
    sublabel: "Enterprise SSO",
    icon: ShieldCheck,
    beta: true,
    locked: true,
  },
  {
    id: "account",
    href: "/dashboard/settings/account",
    label: "Account",
    sublabel: "Profile & security",
    icon: UserIcon,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const tabTranslations: Record<string, { label: string; sub: string }> = {
    general: { label: t("settings.tabs.general"), sub: t("settings.tabs.generalSub") },
    localization: { label: t("settings.tabs.localization"), sub: t("settings.tabs.localizationSub") },
    notifications: { label: t("settings.tabs.notifications"), sub: t("settings.tabs.notificationsSub") },
    "career-page": { label: t("settings.tabs.careerPage"), sub: t("settings.tabs.careerPageSub") },
    members: { label: t("settings.tabs.members"), sub: t("settings.tabs.membersSub") },
    billing: { label: t("settings.tabs.billing"), sub: t("settings.tabs.billingSub") },
    integrations: { label: t("settings.tabs.integrations"), sub: t("settings.tabs.integrationsSub") },
    "ai-configuration": { label: t("settings.tabs.aiConfiguration"), sub: t("settings.tabs.aiConfigurationSub") },
    "privacy-retention": { label: t("settings.tabs.privacyRetention"), sub: t("settings.tabs.privacyRetentionSub") },
    sso: { label: t("settings.tabs.sso"), sub: t("settings.tabs.ssoSub") },
    account: { label: t("settings.tabs.account"), sub: t("settings.tabs.accountSub") },
    "email-templates": { label: t("settings.tabs.emailTemplates"), sub: t("settings.tabs.emailTemplatesSub") },
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col">
        <Navbar activeTab="settings" />

        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 overflow-x-hidden">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start w-full">
            {/* ================= LEFT SIDEBAR ================= */}
            <aside className="w-full md:w-60 lg:w-64 shrink-0 space-y-3 sm:space-y-4">
              {/* Back to jobs link */}
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t("settings.backToJobs")}</span>
              </Link>

              {/* Sidebar Title */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <SettingsIcon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("nav.settings")}
                </h2>
              </div>

              {/* Mobile Horizontal Navigation Pills */}
              <nav className="flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 w-full min-w-0">
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard/settings"
                      ? pathname === "/dashboard/settings"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  const localized = tabTranslations[item.id] || {
                    label: item.label,
                    sub: item.sublabel,
                  };

                  return (
                    <Link
                      key={`mobile-${item.id}`}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all",
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{localized.label}</span>
                      {item.locked && (
                        <Lock className="h-3 w-3 shrink-0 opacity-60 ml-0.5" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Desktop Vertical Navigation List */}
              <nav className="hidden md:block space-y-1">
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard/settings"
                      ? pathname === "/dashboard/settings"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  const localized = tabTranslations[item.id] || {
                    label: item.label,
                    sub: item.sublabel,
                  };

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group",
                        isActive
                          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/60",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isActive
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">
                              {localized.label}
                            </span>
                            {item.beta && (
                              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold uppercase text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                Beta
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {localized.sub}
                          </p>
                        </div>
                      </div>

                      {item.locked && (
                        <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0 ml-1.5" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* ================= RIGHT CONTENT AREA ================= */}
            <section className="w-full flex-1 min-w-0 space-y-6">
              {children}
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
