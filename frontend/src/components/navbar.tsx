"use client";

import React from "react";
import { Briefcase, Users, Plus, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

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
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-900 dark:text-white text-lg">
                  Apex ATS
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Sparkles className="h-2.5 w-2.5" /> Next-Gen
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Talent Acquisition & Hiring Pipeline
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
            <button
              onClick={() => onTabChange("jobs")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenApplyModal}
            className="text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            Apply as Candidate
          </Button>

          <Button
            size="sm"
            onClick={onOpenCreateJob}
            className="text-xs font-semibold shadow-sm gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Post New Job
          </Button>
        </div>
      </div>
    </header>
  );
}
