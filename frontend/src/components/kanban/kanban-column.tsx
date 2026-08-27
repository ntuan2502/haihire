"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CandidateCard } from "./candidate-card";
import type { Application, ApplicationStage } from "@/types";

interface KanbanColumnProps {
  stage: ApplicationStage;
  title: string;
  applications: Application[];
  color: string;
  onDeleteApplication: (id: number) => void;
}

export function KanbanColumn({
  stage,
  title,
  applications,
  color,
  onDeleteApplication,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: "Column",
      stage,
    },
  });

  const applicationIds = React.useMemo(
    () => applications.map((a) => a.id.toString()),
    [applications],
  );

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] max-w-[320px] shrink-0 rounded-2xl bg-slate-100/70 p-3 border transition-all duration-200 dark:bg-slate-900/50 ${
        isOver
          ? "border-indigo-400 bg-indigo-50/40 dark:border-indigo-600 dark:bg-indigo-950/20 shadow-md"
          : "border-slate-200/80 dark:border-slate-800/80"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-800/60 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {title}
          </h3>
        </div>

        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {applications.length}
        </span>
      </div>

      {/* Droppable Candidates List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[400px] max-h-[calc(100vh-280px)] pr-1">
        <SortableContext
          items={applicationIds}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <CandidateCard
              key={app.id}
              application={app}
              onDelete={onDeleteApplication}
            />
          ))}
        </SortableContext>

        {/* Empty state placeholder */}
        {applications.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/80 p-4 text-center dark:border-slate-800/80">
            <p className="text-[11px] font-medium text-slate-400">
              Drop candidates here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
