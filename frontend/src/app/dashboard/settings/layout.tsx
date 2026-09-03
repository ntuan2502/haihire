"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  href: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
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
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col">
        <Navbar activeTab="settings" />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* ================= LEFT SIDEBAR ================= */}
            <aside className="md:col-span-4 lg:col-span-3 space-y-4">
              {/* Back to jobs link */}
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to jobs</span>
              </Link>

              {/* Sidebar Title */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <SettingsIcon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Settings
                </h2>
              </div>

              {/* Navigation List */}
              <nav className="space-y-1">
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard/settings"
                      ? pathname === "/dashboard/settings"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                              {item.label}
                            </span>
                            {item.beta && (
                              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold uppercase text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                Beta
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {item.sublabel}
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
            <section className="md:col-span-8 lg:col-span-9 space-y-6">
              {children}
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
