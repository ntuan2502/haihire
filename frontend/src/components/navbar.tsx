"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
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
  Lock,
  Clock,
  Radio,
  Bot,
  Moon,
  Globe,
  MessageSquareWarning,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";

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
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme === "dark" || theme === "dark") : false;

  const toggleDarkMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTheme(isDark ? "light" : "dark");
  };

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
  else if (pathname === "/dashboard") currentTab = "dashboard";

  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "applications", label: "Applications", icon: FileText },
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "interviews", label: "Interviews", icon: Calendar },
    { id: "assistant", label: "Assistant", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Locked features from the screenshot
  const lockedMobileItems = [
    { label: "Timeline", icon: Clock },
    { label: "Source Tracking", icon: Radio },
    { label: "AI Analysis", icon: Bot },
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
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white cursor-pointer">
                  <span>More</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[140px]">
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard")}
                    className="text-xs cursor-pointer"
                  >
                    Analytics & Reports
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleNavClick("candidates")}
                    className="text-xs cursor-pointer"
                  >
                    Talent Pools
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/onboarding/create-org")}
                    className="text-xs cursor-pointer"
                  >
                    Organization Setup
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Right: Upgrade, + New Job, Avatar, Theme, Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Upgrade Button (Indigo pill with Sparkles) */}
            <button
              type="button"
              onClick={() => handleNavClick("settings")}
              className="flex items-center justify-center h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer gap-1.5"
              title="Upgrade"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">
                Upgrade
              </span>
            </button>

            {/* + New Job Button (Desktop Only) */}
            <Button
              size="sm"
              onClick={handleCreateJobClick}
              className="hidden sm:inline-flex h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 shadow-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              New Job
            </Button>

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
                  className="w-64 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-1 z-50 text-slate-800 dark:text-slate-200"
                >
                  {/* 1. User Full Name & Email */}
                  <div className="px-2 pt-1 pb-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                      {user.name}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                      {user.email}
                    </span>
                  </div>

                  {/* 2. Organization Selector Box */}
                  <div
                    onClick={() => router.push("/onboarding/create-org")}
                    className="w-full my-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {user.organization?.name || "amt"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                  </div>

                  {/* 3. Dark Mode Row */}
                  <div
                    onClick={toggleDarkMode}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Moon className="h-4 w-4 text-slate-400" />
                      <span>Dark mode</span>
                    </div>
                    <div
                      className={cn(
                        "w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5",
                        isDark
                          ? "bg-blue-600 justify-end"
                          : "bg-slate-200 dark:bg-slate-700 justify-start",
                      )}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform" />
                    </div>
                  </div>

                  {/* 4. Language Row */}
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span>Language</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      us en <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* 5. Settings */}
                  <div
                    onClick={() => handleNavClick("settings")}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Settings</span>
                  </div>

                  {/* 6. Updates & changelog */}
                  <div
                    onClick={() => {}}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-slate-400" />
                    <span>Updates & changelog</span>
                  </div>

                  {/* 7. Report issue */}
                  <div
                    onClick={() => {}}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <MessageSquareWarning className="h-4 w-4 text-slate-400" />
                    <span>Report issue</span>
                  </div>

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* 8. Sign out */}
                  <div
                    onClick={logout}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
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
                  Sign In
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
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileNavSelect(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Locked Items (Timeline, Source Tracking, AI Analysis) */}
              {lockedMobileItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 dark:text-slate-500"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                );
              })}

              {/* Settings Item */}
              <button
                type="button"
                onClick={() => handleMobileNavSelect("settings")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${
                  currentTab === "settings"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <Settings
                  className={`h-4 w-4 ${
                    currentTab === "settings"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500"
                  }`}
                />
                <span>Settings</span>
              </button>
            </div>

            {/* Bottom Actions: + New Job, Org Selector, Locale */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/30">
              {/* + New Job Button */}
              <Button
                onClick={() => {
                  handleCreateJobClick();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                New Job
              </Button>

              {/* Organization Selector */}
              <button
                type="button"
                onClick={() => {
                  router.push("/onboarding/create-org");
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">
                    {user?.organization?.name || "AMT"}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Locale Selector */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                <span className="flex items-center gap-1.5">
                  us en
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
