"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Users,
  Plus,
  Sparkles,
  LogOut,
  ShieldCheck,
  Building2,
  KeyRound,
} from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavbarProps {
  activeTab: "jobs" | "kanban";
  onTabChange: (tab: "jobs" | "kanban") => void;
  onOpenCreateJob: () => void;
  onOpenApplyModal: () => void;
  jobsCount: number;
  candidatesCount: number;
}

export function Navbar({
  activeTab,
  onTabChange,
  onOpenCreateJob,
  onOpenApplyModal,
  jobsCount,
  candidatesCount,
}: NavbarProps) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900/50";
      case "HR":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50";
      case "INTERVIEWER":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/50";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "HR";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90 transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-900 dark:text-white text-lg">
                  Apex ATS
                </span>
                {user?.organization ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                    <Building2 className="h-3 w-3" />
                    {user.organization.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <Sparkles className="h-2.5 w-2.5" /> Next-Gen
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Talent Acquisition & Hiring Pipeline
              </p>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
            <button
              onClick={() => onTabChange("jobs")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "jobs"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Job Openings
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {jobsCount}
              </span>
            </button>
            <button
              onClick={() => onTabChange("kanban")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "kanban"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Candidate Pipeline
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {candidatesCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Action Buttons, Recruiter Session & Theme Switcher */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenApplyModal}
            className="text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            Apply as Candidate
          </Button>

          {isAuthenticated && (
            <Button
              size="sm"
              onClick={onOpenCreateJob}
              className="text-xs font-semibold shadow-sm gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Post New Job
            </Button>
          )}

          <ThemeToggle />

          {/* Recruiter Authentication Section */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pl-2 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
                aria-label="User Profile"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-xs font-bold text-white shadow-xs">
                  {getUserInitials(user.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left pr-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {user.name}
                  </span>
                  <span
                    className={`inline-block text-[9px] font-extrabold uppercase px-1 rounded-sm border ${getRoleBadgeColor(
                      user.role,
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
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
                className="text-xs font-semibold gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white cursor-pointer shadow-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-600" />
                Recruiter Portal
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
