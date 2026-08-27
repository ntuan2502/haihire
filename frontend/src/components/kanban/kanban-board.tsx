"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { CandidateCard } from "./candidate-card";
import { applicationsApi } from "@/lib/api";
import type { Application, ApplicationStage, Job } from "@/types";
import { Briefcase, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface KanbanBoardProps {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (jobId: number) => void;
  onOpenApplyModal: () => void;
}

const STAGES: { stage: ApplicationStage; title: string; color: string }[] = [
  { stage: "APPLIED", title: "Applied", color: "bg-blue-500" },
  { stage: "SCREENING", title: "Screening", color: "bg-violet-500" },
  { stage: "INTERVIEW", title: "Interview", color: "bg-amber-500" },
  { stage: "OFFER", title: "Offer", color: "bg-emerald-500" },
  { stage: "HIRED", title: "Hired", color: "bg-teal-500" },
  { stage: "REJECTED", title: "Rejected", color: "bg-rose-500" },
];

export function KanbanBoard({
  jobs,
  selectedJobId,
  onSelectJob,
  onOpenApplyModal,
}: KanbanBoardProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeApplication, setActiveApplication] = useState<Application | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch applications whenever selected job changes
  useEffect(() => {
    if (!selectedJobId) {
      setApplications([]);
      return;
    }

    const fetchApps = async () => {
      try {
        setLoading(true);
        const data = await applicationsApi.getByJob(selectedJobId);
        setApplications(data);
      } catch (err) {
        console.error("Failed to load applications for job:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [selectedJobId]);

  const currentJob = jobs.find((j) => j.id === selectedJobId);

  // Group applications by stage
  const columnsMap = React.useMemo(() => {
    const map: Record<ApplicationStage, Application[]> = {
      APPLIED: [],
      SCREENING: [],
      INTERVIEW: [],
      OFFER: [],
      HIRED: [],
      REJECTED: [],
    };

    applications.forEach((app) => {
      if (map[app.stage]) {
        map[app.stage].push(app);
      } else {
        map.APPLIED.push(app);
      }
    });

    return map;
  }, [applications]);

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const current = applications.find(
      (a) => a.id.toString() === active.id.toString(),
    );
    if (current) setActiveApplication(current);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) return;

    const isActiveAnApp = active.data.current?.type === "Application";
    const isOverAnApp = over.data.current?.type === "Application";
    const isOverAColumn = over.data.current?.type === "Column";

    if (!isActiveAnApp) return;

    // Dropping over another Application in a different column
    if (isOverAnApp) {
      const activeApp = applications.find((a) => a.id.toString() === activeId);
      const overApp = applications.find((a) => a.id.toString() === overId);

      if (activeApp && overApp && activeApp.stage !== overApp.stage) {
        setApplications((apps) => {
          const activeIndex = apps.findIndex((a) => a.id.toString() === activeId);
          const overIndex = apps.findIndex((a) => a.id.toString() === overId);

          const updated = [...apps];
          updated[activeIndex] = {
            ...updated[activeIndex],
            stage: overApp.stage,
          };

          return arrayMove(updated, activeIndex, overIndex);
        });
      }
    }

    // Dropping over a Column
    if (isOverAColumn) {
      const activeApp = applications.find((a) => a.id.toString() === activeId);
      const overStage = over.data.current?.stage as ApplicationStage;

      if (activeApp && overStage && activeApp.stage !== overStage) {
        setApplications((apps) => {
          const activeIndex = apps.findIndex((a) => a.id.toString() === activeId);
          const updated = [...apps];
          updated[activeIndex] = {
            ...updated[activeIndex],
            stage: overStage,
          };
          return updated;
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveApplication(null);

    if (!over) return;

    const activeId = Number(active.id);
    const activeApp = applications.find((a) => a.id === activeId);
    if (!activeApp) return;

    let targetStage: ApplicationStage = activeApp.stage;
    let targetIndex = 0;

    if (over.data.current?.type === "Column") {
      targetStage = over.data.current.stage;
      const columnApps = applications.filter((a) => a.stage === targetStage);
      targetIndex = columnApps.length;
    } else if (over.data.current?.type === "Application") {
      const overApp = over.data.current.application as Application;
      targetStage = overApp.stage;
      const columnApps = applications.filter((a) => a.stage === targetStage);
      targetIndex = columnApps.findIndex((a) => a.id === overApp.id);
    }

    // Sync to backend via PATCH /applications/:id/stage
    try {
      await applicationsApi.updateStage(activeId, targetStage, targetIndex);
    } catch (err) {
      console.error("Failed to sync stage update with server:", err);
    }
  };

  const handleDeleteApplication = async (id: number) => {
    try {
      await applicationsApi.delete(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete application:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kanban Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {/* Role Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Target Role:</span>
          </div>

          <div className="w-72">
            <Select
              value={selectedJobId ? selectedJobId.toString() : ""}
              onValueChange={(val) => val && onSelectJob(Number(val))}
            >
              <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-950">
                <SelectValue placeholder="Choose a job position" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title} ({job.applicationsCount || 0} candidates)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {currentJob && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 mr-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {applications.length}
              </span>{" "}
              Total Candidates in Pipeline
            </div>
          )}
          <Button
            size="sm"
            onClick={onOpenApplyModal}
            className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      {!selectedJobId ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-16 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <Briefcase className="h-10 w-10 text-indigo-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Select a Job to view candidate pipeline
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Choose a job position from the dropdown above to manage candidate hiring stages on the interactive Kanban board.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
            {STAGES.map(({ stage, title, color }) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                title={title}
                color={color}
                applications={columnsMap[stage]}
                onDeleteApplication={handleDeleteApplication}
              />
            ))}
          </div>

          <DragOverlay>
            {activeApplication ? (
              <div className="rotate-2 scale-105 shadow-xl">
                <CandidateCard application={activeApplication} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
