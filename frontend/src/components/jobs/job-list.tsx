"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, Briefcase, Plus } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { JobCard } from "./job-card";
import type { Job } from "@/types";

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  onViewCandidates: (jobId: number) => void;
  onApply: (job: Job) => void;
  onOpenCreateJob: () => void;
  onDeleteJob: (jobId: number) => void;
}

export function JobList({
  jobs,
  loading,
  onViewCandidates,
  onApply,
  onOpenCreateJob,
  onDeleteJob,
}: JobListProps) {
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department) set.add(j.department);
    });
    return Array.from(set);
  }, [jobs]);

  // Filter jobs based on search query, department, and status
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.department.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase()) ||
        (job.requirements && job.requirements.toLowerCase().includes(search.toLowerCase()));

      const matchDept =
        selectedDepartment === "ALL" ||
        job.department.toLowerCase() === selectedDepartment.toLowerCase();

      const matchStatus =
        selectedStatus === "ALL" || job.status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [jobs, search, selectedDepartment, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search job title, skills, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              aria-label="Filter by department"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Active / Published</option>
            <option value="DRAFT">Draft</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-3">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No job openings found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
            {search || selectedDepartment !== "ALL" || selectedStatus !== "ALL"
              ? "No job openings matched your active filters. Try clearing your search parameters."
              : "Get started by posting your first job opening to start receiving candidate applications."}
          </p>
          <Button onClick={onOpenCreateJob} className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-3.5 w-3.5" />
            Create Job Opening
          </Button>
        </div>
      )}

      {/* Grid of Job Cards */}
      {!loading && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewCandidates={onViewCandidates}
              onApply={onApply}
              onDelete={onDeleteJob}
            />
          ))}
        </div>
      )}
    </div>
  );
}
