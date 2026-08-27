"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  Mail,
  Phone,
  Clock,
  Download,
  GripVertical,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import type { Application, ApplicationStage } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

interface CandidateCardProps {
  application: Application;
  onStageChange?: (id: number, stage: ApplicationStage) => void;
  onDelete?: (id: number) => void;
}

export function CandidateCard({
  application,
  onDelete,
}: CandidateCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id.toString(),
    data: {
      type: "Application",
      application,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Generate initials for candidate avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Card className="border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/90 cursor-default">
        <CardContent className="p-3.5 space-y-2.5">
          {/* Header with Drag Handle & Avatar */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-[11px] font-bold text-white shadow-xs">
                {getInitials(application.candidateName)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {application.candidateName}
                </h4>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeTime(application.createdAt)}
                </span>
              </div>
            </div>

            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200"
              title="Drag to change stage"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{application.candidateEmail}</span>
            </div>
            {application.candidatePhone && (
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{application.candidatePhone}</span>
              </div>
            )}
          </div>

          {/* Notes if present */}
          {application.notes && (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-md italic line-clamp-2 border border-slate-100 dark:border-slate-800">
              &quot;{application.notes}&quot;
            </p>
          )}

          {/* Resume PDF Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            {application.resumeUrl ? (
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>CV / Resume</span>
                <Download className="h-3 w-3 opacity-60" />
              </a>
            ) : (
              <span className="text-[11px] text-slate-400">No CV attached</span>
            )}

            {/* Delete button */}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(application.id)}
                className="h-6 w-6 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove application"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
