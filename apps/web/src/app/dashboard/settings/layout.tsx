"use client";

import { useMemo, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useHasPermission } from "@/hooks/use-has-permission";
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
  History,
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
    locked: true,
  },
  {
    id: "career-page",
    href: "/dashboard/settings/career-page",
    label: "Career Page",
    sublabel: "Branded public page",
    icon: AppWindow,
    locked: true,
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
    id: "roles",
    href: "/dashboard/settings/roles",
    label: "Roles & Permissions",
    sublabel: "RBAC matrix & overrides",
    icon: ShieldCheck,
  },
  {
    id: "audit-log",
    href: "/dashboard/settings/audit-log",
    label: "Audit Log",
    sublabel: "Security & activity events",
    icon: History,
  },
  {
    id: "billing",
    href: "/dashboard/settings/billing",
    label: "Billing",
    sublabel: "Plan & payment",
    icon: CreditCard,
    locked: true,
  },
  {
    id: "integrations",
    href: "/dashboard/settings/integrations",
    label: "Integrations",
    sublabel: "Calendar & services",
    icon: Plug,
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
    label: "Privacy & Retention",
    sublabel: "Retention policy",
    icon: Clock,
    locked: true,
  },
  {
    id: "sso",
    href: "/dashboard/settings/sso",
    label: "Single Sign-On (SSO)",
    sublabel: "Enterprise SSO",
    icon: ShieldCheck,
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

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const canViewGeneral = useHasPermission("org:view");
  const canViewEmailTemplates = useHasPermission("email:view");
  const canManageMembers = useHasPermission("org:manage_members");
  const canManageRoles = useHasPermission("org:manage_roles");
  const canViewAuditLog = useHasPermission("org:view_audit_log");
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );

  const visibleNavItems = useMemo(() => {
    return SETTINGS_NAV_ITEMS.filter((item) => {
      if (item.id === "general") return canViewGeneral;
      if (item.id === "email-templates") return canViewEmailTemplates;
      if (item.id === "members") return canManageMembers;
      if (item.id === "roles") return canManageRoles;
      if (item.id === "audit-log") return canViewAuditLog;
      if (item.id === "integrations") return canManageIntegrations;
      return true;
    });
  }, [
    canViewGeneral,
    canViewEmailTemplates,
    canManageMembers,
    canManageRoles,
    canViewAuditLog,
    canManageIntegrations,
  ]);

  const tabTranslations: Record<string, { label: string; sub: string }> = {
    general: {
      label: t("settings.tabs.general"),
      sub: t("settings.tabs.generalSub"),
    },
    localization: {
      label: t("settings.tabs.localization"),
      sub: t("settings.tabs.localizationSub"),
    },
    notifications: {
      label: t("settings.tabs.notifications"),
      sub: t("settings.tabs.notificationsSub"),
    },
    "career-page": {
      label: t("settings.tabs.careerPage"),
      sub: t("settings.tabs.careerPageSub"),
    },
    members: {
      label: t("settings.tabs.members"),
      sub: t("settings.tabs.membersSub"),
    },
    roles: {
      label: t("settings.tabs.roles"),
      sub: t("settings.tabs.rolesSub"),
    },
    "audit-log": {
      label: t("settings.tabs.auditLog"),
      sub: t("settings.tabs.auditLogSub"),
    },
    billing: {
      label: t("settings.tabs.billing"),
      sub: t("settings.tabs.billingSub"),
    },
    integrations: {
      label: t("settings.tabs.integrations"),
      sub: t("settings.tabs.integrationsSub"),
    },
    "ai-configuration": {
      label: t("settings.tabs.aiConfiguration"),
      sub: t("settings.tabs.aiConfigurationSub"),
    },
    "privacy-retention": {
      label: t("settings.tabs.privacyRetention"),
      sub: t("settings.tabs.privacyRetentionSub"),
    },
    sso: { label: t("settings.tabs.sso"), sub: t("settings.tabs.ssoSub") },
    account: {
      label: t("settings.tabs.account"),
      sub: t("settings.tabs.accountSub"),
    },
    "email-templates": {
      label: t("settings.tabs.emailTemplates"),
      sub: t("settings.tabs.emailTemplatesSub"),
    },
  };

  return (
    <AuthGuard>
      <div
        data-testid="settings-shell"
        className="min-h-screen md:h-screen md:overflow-hidden bg-slate-50/60 dark:bg-slate-950 flex flex-col"
      >
        <Navbar activeTab="settings" />

        <main className="flex-1 min-h-0 w-full flex flex-col overflow-x-hidden">
          <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto md:overflow-hidden">
            {/* ================= LEFT SIDEBAR ================= */}
            <aside
              data-testid="settings-sidebar"
              className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col md:h-full md:min-h-0 md:border-r md:border-slate-200/70 dark:md:border-slate-800/70 px-4 sm:px-6 lg:pl-8 md:pr-0 pt-6"
            >
              <div className="shrink-0 space-y-3 sm:space-y-4 md:pr-4 md:pb-3">
                {/* Back to jobs link */}
                <Link
                  href="/dashboard/jobs"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("settings.backToJobs")}</span>
                </Link>

                {/* Sidebar Title */}
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <SettingsIcon
                    className="h-4 w-4 text-slate-700 dark:text-slate-300"
                    aria-hidden="true"
                  />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("nav.settings")}
                  </h2>
                </div>

                {/* Mobile Horizontal Navigation Pills */}
                <nav
                  aria-label={t("nav.settings")}
                  className="flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 w-full min-w-0"
                >
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard/settings"
                        ? pathname === "/dashboard/settings"
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);

                    const localized = tabTranslations[item.id] || {
                      label: item.label,
                      sub: item.sublabel,
                    };

                    if (item.locked) {
                      return (
                        <div
                          key={`mobile-${item.id}`}
                          aria-disabled="true"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-800/50 opacity-50 cursor-not-allowed select-none"
                        >
                          <Icon
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                          <span>{localized.label}</span>
                          <Lock
                            className="h-3 w-3 shrink-0 opacity-60 ml-0.5"
                            aria-hidden="true"
                          />
                        </div>
                      );
                    }

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
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{localized.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Desktop Vertical Navigation List (Independent Scroll Container) */}
              <nav
                data-testid="settings-sidebar-nav"
                aria-label={t("nav.settings")}
                className="hidden md:block flex-1 min-h-0 overflow-y-auto space-y-1 pr-3 md:pr-4 pb-6"
              >
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard/settings"
                      ? pathname === "/dashboard/settings"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                  const localized = tabTranslations[item.id] || {
                    label: item.label,
                    sub: item.sublabel,
                  };

                  if (item.locked) {
                    return (
                      <div
                        key={item.id}
                        aria-disabled="true"
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left select-none opacity-45 cursor-not-allowed text-slate-400 dark:text-slate-500"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block truncate text-slate-400 dark:text-slate-500">
                              {localized.label}
                            </span>
                            <p className="text-[11px] text-slate-400/80 dark:text-slate-600 truncate">
                              {localized.sub}
                            </p>
                          </div>
                        </div>

                        <Lock
                          className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0 ml-1.5"
                          aria-hidden="true"
                        />
                      </div>
                    );
                  }

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
                          <span className="text-xs font-semibold block truncate">
                            {localized.label}
                          </span>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {localized.sub}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* ================= RIGHT CONTENT AREA (Independent Scroll Container) ================= */}
            <section
              data-testid="settings-content"
              className="w-full flex-1 min-w-0 md:h-full md:min-h-0 md:overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
            >
              {children}
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
