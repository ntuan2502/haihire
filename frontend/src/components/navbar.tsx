"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Building2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCreateJob: () => void;
  onOpenApplyModal?: () => void;
  jobsCount?: number;
  candidatesCount?: number;
}

export function Navbar({
  activeTab,
  onTabChange,
  onOpenCreateJob,
  onOpenApplyModal,
  jobsCount = 0,
  candidatesCount = 0,
}: NavbarProps) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const getUserInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 transition-colors duration-200">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left Section: Logo & Nav items */}
        <div className="flex items-center gap-1 xl:gap-2">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 mr-2 sm:mr-3 group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <span className="font-black text-sm tracking-tighter">R</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight hidden sm:inline">
              {user?.organization?.name || "Reqcore"}
            </span>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white cursor-pointer"
              >
                <span>More</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => onTabChange("dashboard")} className="text-xs cursor-pointer">
                  Analytics & Reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTabChange("candidates")} className="text-xs cursor-pointer">
                  Talent Pools
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/onboarding/create-org")} className="text-xs cursor-pointer">
                  Organization Setup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Right Section: Upgrade, + New Job, Avatar, Theme */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Upgrade Button (Purple Pill) */}
          <button
            type="button"
            onClick={() => onTabChange("settings")}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            Upgrade
          </button>

          {/* + New Job Button (Blue) */}
          <Button
            size="sm"
            onClick={onOpenCreateJob}
            className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 shadow-xs gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            New Job
          </Button>

          <ThemeToggle />

          {/* User Profile Avatar */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-1 rounded-full p-0.5 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all cursor-pointer"
                aria-label="User Profile"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                  {getUserInitials(user.name)}
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="font-bold text-xs">{user.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{user.email}</span>
                    {user.organization && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Organization</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{user.organization.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <KeyRound className="h-2.5 w-2.5" /> Invite: {user.organization.inviteCode}
                        </p>
                      </div>
                    )}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/onboarding/create-org")}
                  className="cursor-pointer gap-2 text-xs font-medium"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {user.organization ? "Switch / Create Org" : "Setup Organization"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  variant="destructive"
                  className="cursor-pointer gap-2 text-xs font-semibold"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
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
        </div>
      </div>
    </header>
  );
}
