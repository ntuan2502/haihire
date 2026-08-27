"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { CandidateCard } from "./candidate-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import {
  useJobApplications,
  useUpdateStageMutation,
  useDeleteApplicationMutation,
} from "@/hooks/use-queries";
import type { Job, Application, ApplicationStage } from "@/types";
import { Briefcase, UserPlus } from "lucide-react";

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
  const { data: serverApplications = [], isLoading: loading } =
    useJobApplications(selectedJobId);
  const updateStageMutation = useUpdateStageMutation();
  const deleteAppMutation = useDeleteApplicationMutation();

  const [applications, setApplications] = useState<Application[]>([]);
  const [activeApplication, setActiveApplication] = useState<Application | null>(
    null,
  );

  // Sync server applications into local state for drag animations
  useEffect(() => {
    setApplications(serverApplications);
  }, [serverApplications]);

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

    // Optimistic / Server Sync via Mutation
    updateStageMutation.mutate({
      id: activeId,
      stage: targetStage,
      orderIndex: targetIndex,
    });
  };

  const handleDeleteApplication = (id: number) => {
    deleteAppMutation.mutate(id);
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
            {loading && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            )}
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
                  <SelectItem
                    key={job.id}
                    value={job.id.toString()}
                    className="text-xs"
                  >
                    {job.title} ({job.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentJob && (
            <span className="text-xs text-slate-500">
              {applications.length} candidate{applications.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Action button */}
        <Button
          onClick={onOpenApplyModal}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
          disabled={!selectedJobId}
        >
          <UserPlus className="h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {/* Kanban Board Columns Area */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((col) => (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              title={col.title}
              color={col.color}
              applications={columnsMap[col.stage]}
              onDeleteApplication={handleDeleteApplication}
            />
          ))}
        </div>

        {/* Drag Overlay with Smooth Animation */}
        <DragOverlay>
          {activeApplication ? (
            <div className="rotate-2 scale-105 opacity-95 transition-transform">
              <CandidateCard application={activeApplication} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
