"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
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
  Sparkles,
  Plus,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Clock,
  Radio,
  Bot,
  Check,
  Sun,
  Globe,
  MessageSquareWarning,
  BarChart3,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/context/auth-context";
import { useMyOrgs, useSwitchOrgMutation } from "@/hooks/use-queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LanguageDropdown } from "./language-dropdown";
import { cn, getInitials } from "@/lib/utils";
import { useI18n, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";

export type NavTab =
  | "dashboard"
  | "jobs"
  | "candidates"
  | "applications"
  | "inbox"
  | "interviews"
  | "assistant"
  | "settings";

interface NavbarProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  onOpenCreateJob?: () => void;
  onOpenApplyModal?: () => void;
  jobsCount?: number;
  candidatesCount?: number;
}

export function Navbar({
  activeTab = "dashboard",
  onTabChange,
  onOpenCreateJob,
  onOpenApplyModal: _onOpenApplyModal,
  jobsCount: _jobsCount = 0,
  candidatesCount: _candidatesCount = 0,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, canEdit, isOwner, isAdmin } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { data: myOrgs = [] } = useMyOrgs();
  const switchOrgMutation = useSwitchOrgMutation();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isMobileOrgDropdownOpen, setIsMobileOrgDropdownOpen] = useState(false);
  const [isMobileLangDropdownOpen, setIsMobileLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
  else if (pathname.startsWith("/dashboard/settings")) currentTab = "settings";
  else if (pathname === "/dashboard") currentTab = "dashboard";

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    implemented?: boolean;
  }[] = [
    { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, implemented: true },
    { id: "jobs", label: t("nav.jobs"), icon: Briefcase, implemented: true },
    { id: "candidates", label: t("nav.candidates"), icon: Users, implemented: true },
    { id: "applications", label: t("nav.applications"), icon: FileText, implemented: true },
    { id: "inbox", label: t("nav.inbox"), icon: Inbox, implemented: false },
    { id: "interviews", label: t("nav.interviews"), icon: Calendar, implemented: true },
    { id: "assistant", label: t("nav.assistant"), icon: MessageSquare, implemented: false },
    { id: "settings", label: t("nav.settings"), icon: Settings, implemented: true },
  ];

  // Features inside "More" (all Coming Soon)
  const moreItems = [
    { label: t("nav.features.analyticsReports"), icon: BarChart3 },
    { label: t("nav.features.talentPools"), icon: Users },
    { label: t("nav.features.sourceTracking"), icon: Radio },
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
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 transition-colors duration-200">
        <div className="flex h-14 w-full items-center justify-between px-3 sm:px-6">
          {/* Left: Logo & Desktop Navigation */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 mr-1 sm:mr-2 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <span className="font-black text-sm tracking-tighter">A</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight hidden sm:inline">
                {user?.organization?.name || "ATS"}
              </span>
            </Link>

            {/* Desktop Navigation Items */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  const isImplemented = item.implemented !== false;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!isImplemented}
                      onClick={() => isImplemented && handleNavClick(item.id)}
                      title={!isImplemented ? `${item.label} (Coming soon)` : undefined}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${!isImplemented
                          ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                          : isActive
                            ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400 font-bold cursor-pointer"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white cursor-pointer"
                        }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 ${!isImplemented
                            ? "text-slate-400 opacity-60"
                            : isActive
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
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white cursor-pointer">
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

          {/* Right: Upgrade, + New Job, Avatar, Theme, Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Upgrade Button (Indigo pill with Sparkles) */}
            <button
              type="button"
              disabled
              className="flex items-center justify-center h-8 px-3.5 rounded-xl bg-indigo-600/60 text-white/80 shadow-xs cursor-not-allowed gap-1.5 opacity-60"
              title={`${t("nav.upgrade")} (${t("common.comingSoon")})`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">
                {t("nav.upgrade")}
              </span>
            </button>

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

            {/* User Profile Avatar with Dropdown matching Screenshot */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1 rounded-full p-0.5 hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-800 transition-all cursor-pointer outline-none"
                  aria-label="User Profile"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                    {getInitials(user.name)}
                  </div>
                  <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-1 z-50 text-slate-800 dark:text-slate-200 overflow-visible"
                >
                  {/* 1. User Full Name & Email & Role Badge */}
                  <div className="px-2 pt-1 pb-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                        {user.name}
                      </span>
                      {isOwner ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                          Owner
                        </span>
                      ) : isAdmin ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-md border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                          Member
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                      {user.email}
                    </span>
                  </div>

                  {/* 2. Organization Selector Box with Dropdown */}
                  <div className="w-full my-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden transition-all">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOrgDropdownOpen(!isOrgDropdownOpen);
                      }}
                      className="w-full p-2 flex items-center justify-between hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {user.organization?.name || "No Organization"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0",
                          isOrgDropdownOpen && "rotate-180",
                        )}
                      />
                    </div>

                    {/* Expanded Organization List */}
                    {isOrgDropdownOpen && (
                      <div className="border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto">
                        {myOrgs.length > 0 ? (
                          myOrgs.map((org) => {
                            const isActive = org.id === user.organizationId;
                            return (
                              <div
                                key={org.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isActive) {
                                    try {
                                      await switchOrgMutation.mutateAsync(org.id);
                                      router.push("/dashboard");
                                    } catch (err) {
                                      console.error("Failed to switch workspace:", err);
                                    }
                                  }
                                  setIsOrgDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full px-2.5 py-1.5 flex items-center justify-between text-xs cursor-pointer transition-colors",
                                  isActive
                                    ? "bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold"
                                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                )}
                              >
                                <span className="truncate">{org.name}</span>
                                {isActive && (
                                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                )}
                              </div>
                            );
                          })
                        ) : user.organization ? (
                          <div className="w-full px-2.5 py-1.5 flex items-center justify-between text-xs bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold cursor-default">
                            <span className="truncate">{user.organization.name}</span>
                            <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          </div>
                        ) : null}

                        {/* + Create organization item */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOrgDropdownOpen(false);
                            router.push("/onboarding/create-org?mode=create");
                          }}
                          className="w-full px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{t("nav.createOrganization")}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Theme Row */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Sun className="h-4 w-4 text-slate-400" />
                      <span>{locale === "vi" ? "Giao diện" : "Theme"}</span>
                    </div>
                    <ThemeToggle />
                  </div>

                  {/* 4. Language Row with shared LanguageDropdown */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span>{t("nav.language")}</span>
                    </div>
                    <LanguageDropdown />
                  </div>

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* 5. Settings */}
                  <div
                    onClick={() => handleNavClick("settings")}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>{t("nav.settings")}</span>
                  </div>

                  {/* 6. Updates & changelog */}
                  <div
                    onClick={() => { }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-slate-400" />
                    <span>{t("nav.updatesChangelog")}</span>
                  </div>

                  {/* 7. Report issue */}
                  <div
                    onClick={() => { }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <MessageSquareWarning className="h-4 w-4 text-slate-400" />
                    <span>{t("nav.reportIssue")}</span>
                  </div>

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* 8. Sign out */}
                  <div
                    onClick={logout}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t("nav.signOut")}</span>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
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

      {/* MOBILE TOP-DOWN DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-14 bottom-0 z-40 lg:hidden">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          {/* Top-Down Dropdown Menu Container */}
          <div className="relative w-full max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-top-4 duration-200 z-10 flex flex-col justify-between">
            {/* Navigation List Items */}
            <div className="px-3 py-3 space-y-0.5">
              {navItems
                .filter((item) => item.id !== "settings")
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  const isImplemented = item.implemented !== false;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!isImplemented}
                      onClick={() => isImplemented && handleMobileNavSelect(item.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left ${!isImplemented
                          ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                          : isActive
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold cursor-pointer"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white cursor-pointer"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 ${!isImplemented
                              ? "text-slate-400 opacity-60"
                              : isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-500"
                            }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {!isImplemented && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                          {t("common.soon")}
                        </span>
                      )}
                    </button>
                  );
                })}

              {/* More (Coming Soon) */}
              <div className="pt-2.5 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("nav.moreComingSoon")}
              </div>
              {moreItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                      {t("common.soon")}
                    </span>
                  </div>
                );
              })}

              {/* Divider */}
              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* Settings Item */}
              <button
                type="button"
                onClick={() => handleMobileNavSelect("settings")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${currentTab === "settings"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  }`}
              >
                <Settings
                  className={`h-4 w-4 ${currentTab === "settings"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500"
                    }`}
                />
                <span>{t("nav.settings")}</span>
              </button>
            </div>

            {/* Bottom Actions: + New Job, Org Selector, Locale */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/30">
              {/* + New Job Button (Admins only) */}
              {canEdit && (
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
              )}

              {/* Organization Selector */}
              <div className="w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div
                  onClick={() => setIsMobileOrgDropdownOpen(!isMobileOrgDropdownOpen)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="truncate">{user?.organization?.name || "No Organization"}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200",
                      isMobileOrgDropdownOpen && "rotate-180",
                    )}
                  />
                </div>

                {isMobileOrgDropdownOpen && (
                  <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-44 overflow-y-auto">
                    {myOrgs.map((org) => {
                      const isActive = org.id === user?.organizationId;
                      return (
                        <div
                          key={org.id}
                          onClick={async () => {
                            if (!isActive) {
                              try {
                                await switchOrgMutation.mutateAsync(org.id);
                                router.push("/dashboard");
                              } catch (err) {
                                console.error("Failed to switch workspace:", err);
                              }
                            }
                            setIsMobileOrgDropdownOpen(false);
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 flex items-center justify-between text-xs cursor-pointer",
                            isActive
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60",
                          )}
                        >
                          <span className="truncate">{org.name}</span>
                          {isActive && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                      );
                    })}
                    <div
                      onClick={() => {
                        setIsMobileOrgDropdownOpen(false);
                        setMobileMenuOpen(false);
                        router.push("/onboarding/create-org?mode=create");
                      }}
                      className="w-full px-3 py-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("nav.createOrganization")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Locale Selector */}
              <div className="w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div
                  onClick={() => setIsMobileLangDropdownOpen(!isMobileLangDropdownOpen)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <span>{t("nav.language")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="text-sm">{SUPPORTED_LOCALES[locale].flag}</span>
                    <span>{SUPPORTED_LOCALES[locale].label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200",
                        isMobileLangDropdownOpen && "rotate-180"
                      )}
                    />
                  </div>
                </div>

                {isMobileLangDropdownOpen && (
                  <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => {
                      const isLocActive = locKey === locale;
                      const loc = SUPPORTED_LOCALES[locKey];
                      return (
                        <div
                          key={locKey}
                          onClick={() => {
                            setLocale(locKey);
                            setIsMobileLangDropdownOpen(false);
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 flex items-center justify-between text-xs cursor-pointer",
                            isLocActive
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{loc.flag}</span>
                            <span>{loc.label}</span>
                          </div>
                          {isLocActive && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Theme Selector (Mobile) */}
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Sun className="h-4 w-4 text-slate-400" />
                  <span>{locale === "vi" ? "Giao diện" : "Theme"}</span>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
