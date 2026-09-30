"use client";

import { useState, type ElementType } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Inbox,
  Calendar,
  MessageSquare,
  Settings,
  ChevronDown,
  Plus,
  ShieldCheck,
  Menu,
  X,
  Clock,
  Radio,
  Bot,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { BrandLogo } from "@/components/shared/brand-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { BRAND_CONFIG } from "@haihire/shared";
import { useI18n } from "@/i18n";

export type NavTab =
  | "dashboard"
  | "jobs"
  | "candidates"
  | "applications"
  | "inbox"
  | "interviews"
  | "sourcing"
  | "assistant"
  | "settings";

interface NavbarProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  onOpenCreateJob?: () => void;
  jobsCount?: number;
  candidatesCount?: number;
}

export function Navbar({
  activeTab = "dashboard",
  onTabChange,
  onOpenCreateJob,
  jobsCount: _jobsCount = 0,
  candidatesCount: _candidatesCount = 0,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, canEdit } = useAuth();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCreateJobClick = () => {
    if (onOpenCreateJob) {
      onOpenCreateJob();
    } else {
      router.push("/dashboard/jobs/new");
    }
  };

  // Derive active tab from URL pathname or prop
  let currentTab: NavTab = activeTab;
  if (pathname.startsWith("/dashboard/jobs")) currentTab = "jobs";
  else if (pathname.startsWith("/dashboard/candidates")) currentTab = "candidates";
  else if (pathname.startsWith("/dashboard/applications")) currentTab = "applications";
  else if (pathname.startsWith("/dashboard/interviews")) currentTab = "interviews";
  else if (pathname.startsWith("/dashboard/source-tracking")) currentTab = "sourcing";
  else if (pathname.startsWith("/dashboard/settings")) currentTab = "settings";
  else if (pathname === "/dashboard") currentTab = "dashboard";

  const navItems: {
    id: NavTab;
    label: string;
    icon: ElementType;
  }[] = [
    { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { id: "jobs", label: t("nav.jobs"), icon: Briefcase },
    { id: "candidates", label: t("nav.candidates"), icon: Users },
    { id: "applications", label: t("nav.applications"), icon: FileText },
    { id: "interviews", label: t("nav.interviews"), icon: Calendar },
    { id: "sourcing", label: t("nav.features.sourceTracking"), icon: Radio },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  // Features inside "More" (Coming Soon)
  const moreItems = [
    { label: t("nav.inbox"), icon: Inbox },
    { label: t("nav.assistant"), icon: MessageSquare },
    { label: t("nav.features.analyticsReports"), icon: BarChart3 },
    { label: t("nav.features.talentPools"), icon: Users },
    { label: t("nav.features.aiAnalysis"), icon: Bot },
    { label: t("nav.features.timeline"), icon: Clock },
  ];

  const handleNavClick = (tab: NavTab) => {
    if (tab === "jobs") {
      router.push("/dashboard/jobs");
    } else if (tab === "candidates") {
      router.push("/dashboard/candidates");
    } else if (tab === "applications") {
      router.push("/dashboard/applications");
    } else if (tab === "interviews") {
      router.push("/dashboard/interviews");
    } else if (tab === "sourcing") {
      router.push("/dashboard/source-tracking");
    } else if (tab === "settings") {
      router.push("/dashboard/settings");
    } else if (tab === "dashboard") {
      router.push("/dashboard");
    } else {
      onTabChange?.(tab);
    }
  };

  const handleMobileNavSelect = (tab: NavTab) => {
    handleNavClick(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/85 transition-colors duration-200 select-none">
        <div className="flex h-16 w-full items-center justify-between px-3 sm:px-6">
          {/* Left: Logo & Desktop Navigation */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo & Workspace */}
            <div className="flex items-center gap-2.5 mr-1 sm:mr-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 focus:outline-hidden group"
              >
                <BrandLogo size="md" variant="icon-only" />
              </Link>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight hidden sm:inline max-w-[160px] truncate">
                {user?.organization?.name || BRAND_CONFIG.name}
              </span>
            </div>

            {/* Desktop Navigation Items */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* More dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white cursor-pointer transition-colors">
                  <span>{t("nav.more")}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t("common.comingSoon")}
                  </div>
                  {moreItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={idx}
                        disabled
                        className="flex items-center justify-between px-2.5 py-2 text-xs opacity-60 cursor-not-allowed rounded-lg"
                      >
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Icon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                          {t("common.soon")}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Right: + New Job, UserMenu / Sign In, Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* + New Job Button (Desktop Only, Admins only) */}
            {canEdit && (
              <Button
                size="sm"
                onClick={handleCreateJobClick}
                className="hidden sm:inline-flex h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 shadow-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                {t("nav.newJob")}
              </Button>
            )}

            {/* Theme & Language Icon Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageDropdown />
            </div>

            {/* User Profile Avatar with shared UserMenu */}
            {isAuthenticated && user ? (
              <UserMenu />
            ) : (
              <Link href="/auth/login">
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("nav.signIn")}
                </Button>
              </Link>
            )}

            {/* Mobile Hamburger / Close Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 stroke-[2]" />
              ) : (
                <Menu className="h-5 w-5 stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* REUSABLE MOBILE MENU DRAWER */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        breakpoint="lg"
        footer={
          canEdit ? (
            <Button
              onClick={() => {
                handleCreateJobClick();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              {t("nav.newJob")}
            </Button>
          ) : undefined
        }
      >
        {navItems
          .filter((item) => item.id !== "settings")
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleMobileNavSelect(item.id)}
                className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}


        {/* More (Coming Soon) */}
        <div className="pt-2 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t("nav.moreComingSoon")}
        </div>
        {moreItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-xs font-medium text-slate-400 dark:text-slate-500 opacity-70"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                {t("common.soon")}
              </span>
            </div>
          );
        })}

        {/* Divider */}
        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

        {/* Settings Item */}
        <button
          type="button"
          onClick={() => handleMobileNavSelect("settings")}
          className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-colors text-left cursor-pointer ${
            currentTab === "settings"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          }`}
        >
          <Settings
            className={`h-4 w-4 shrink-0 ${
              currentTab === "settings"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500"
            }`}
          />
          <span>{t("nav.settings")}</span>
        </button>
      </MobileDrawer>
    </>
  );
}
