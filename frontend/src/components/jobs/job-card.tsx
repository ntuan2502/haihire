"use client";

import React from "react";
import {
  MapPin,
  Building2,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { Job } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onViewCandidates: (jobId: number) => void;
  onApply: (job: Job) => void;
  onDelete: (jobId: number) => void;
}

export function JobCard({
  job,
  onViewCandidates,
  onApply,
  onDelete,
}: JobCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 border-transparent">
            Active
          </Badge>
        );
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "CLOSED":
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {type.replace("_", " ")}
      </span>
    );
  };

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden border-slate-200/90 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 dark:border-slate-800 dark:hover:border-indigo-800">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {getStatusBadge(job.status)}
              {getTypeBadge(job.type)}
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(job.createdAt)}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
              {job.title}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(job.id)}
            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete role"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Metadata Details */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            {job.department}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {job.location}
          </span>
          {job.salaryRange && (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salaryRange}
            </span>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="py-2">
        <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {job.description}
        </p>

        {/* Stage Pills Breakdown */}
        {job.applicationsByStage && Object.keys(job.applicationsByStage).length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Pipeline:
            </span>
            {Object.entries(job.applicationsByStage).map(([stage, count]) => (
              <span
                key={stage}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                {stage}: <strong className="text-slate-900 dark:text-white">{count}</strong>
              </span>
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>{job.applicationsCount || 0} Candidates</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApply(job)}
            className="text-xs h-8 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Apply
          </Button>

          <Button
            size="sm"
            onClick={() => onViewCandidates(job.id)}
            className="text-xs h-8 gap-1 bg-indigo-600 hover:bg-indigo-700 shadow-xs"
          >
            Pipeline
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
