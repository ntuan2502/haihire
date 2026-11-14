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
  Calendar,
  Settings,
  Plus,
  ShieldCheck,
  Menu,
  X,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { BrandLogo } from "@/components/shared/brand-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { BRAND_CONFIG } from "@haihire/shared";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";

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
  const { user, isAuthenticated, canEdit: _canEdit } = useAuth();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const canViewJobs = useHasPermission("job:view");
  const canViewCandidates = useHasPermission("candidate:view");
  const canViewApplications = useHasPermission("application:view");
  const canViewInterviews = useHasPermission("interview:view");
  const canViewSourcing = useHasPermission("sourcing:view");
  const canCreateJob = useHasPermission("job:create");

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
  else if (pathname.startsWith("/dashboard/candidates"))
    currentTab = "candidates";
  else if (pathname.startsWith("/dashboard/applications"))
    currentTab = "applications";
  else if (pathname.startsWith("/dashboard/interviews"))
    currentTab = "interviews";
  else if (pathname.startsWith("/dashboard/source-tracking"))
    currentTab = "sourcing";
  else if (pathname.startsWith("/dashboard/settings")) currentTab = "settings";
  else if (pathname === "/dashboard") currentTab = "dashboard";

  const navItems: {
    id: NavTab;
    label: string;
    icon: ElementType;
  }[] = [
    { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    ...(canViewJobs
      ? [{ id: "jobs" as const, label: t("nav.jobs"), icon: Briefcase }]
      : []),
    ...(canViewCandidates
      ? [{ id: "candidates" as const, label: t("nav.candidates"), icon: Users }]
      : []),
    ...(canViewApplications
      ? [
          {
            id: "applications" as const,
            label: t("nav.applications"),
            icon: FileText,
          },
        ]
      : []),
    ...(canViewInterviews
      ? [
          {
            id: "interviews" as const,
            label: t("nav.interviews"),
            icon: Calendar,
          },
        ]
      : []),
    ...(canViewSourcing
      ? [
          {
            id: "sourcing" as const,
            label: t("nav.features.sourceTracking"),
            icon: Radio,
          },
        ]
      : []),
    { id: "settings", label: t("nav.settings"), icon: Settings },
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
      <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 transition-colors duration-200 select-none">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo & Desktop Navigation */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo & Workspace */}
            <div className="flex items-center gap-2.5 mr-1 sm:mr-2">
              <Link
                href="/dashboard"
                aria-label={BRAND_CONFIG.name}
                className="flex items-center gap-2 rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 group"
              >
                <BrandLogo size="md" variant="icon-only" />
              </Link>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight hidden sm:inline max-w-[160px] truncate">
                {user?.organization?.name || BRAND_CONFIG.name}
              </span>
            </div>

            {/* Desktop Navigation Items */}
            <nav
              aria-label={t("common.dashboard")}
              className="hidden lg:flex items-center gap-0.5"
            >
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
            </nav>
          </div>

          {/* Right: + New Job, UserMenu / Sign In, Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* + New Job Button (Desktop Only, users with job:create only) */}
            {canCreateJob && (
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
              <Link href="/auth/login" prefetch={false}>
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
              aria-label={t("common.toggleNavigationMenu")}
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
          canCreateJob ? (
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
