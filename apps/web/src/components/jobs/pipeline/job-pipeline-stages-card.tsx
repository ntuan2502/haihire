"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type {
  ApplicationStage,
  UpsertPipelineStagesSchema,
} from "@haihire/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobStages, useUpdateJobStagesMutation } from "@/hooks/use-queries";
import { getStageLabel, STAGES_ORDER } from "@/lib/stages";
import { useI18n } from "@/i18n";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";

type EditableStageRow = UpsertPipelineStagesSchema["stages"][number];

interface JobPipelineStagesCardProps {
  jobId: string;
}

/**
 * Per-job configurable hiring pipeline stages editor inside Job Settings.
 */
export function JobPipelineStagesCard({ jobId }: JobPipelineStagesCardProps) {
  const { t } = useI18n();
  const { data: customStages, isLoading } = useJobStages(jobId);
  const updateStagesMutation = useUpdateJobStagesMutation();

  const [rows, setRows] = useState<EditableStageRow[]>(() =>
    STAGES_ORDER.map((category, index) => ({
      name: getStageLabel(category, t),
      category,
      orderIndex: index,
      color: null,
      isTerminal: category === "HIRED" || category === "REJECTED",
    })),
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty || !customStages || customStages.length === 0) return;
    setRows(
      [...customStages]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          orderIndex: s.orderIndex,
          color: s.color ?? null,
          isTerminal: s.isTerminal,
        })),
    );
  }, [customStages, dirty]);

  const handleUpdateRow = (index: number, patch: Partial<EditableStageRow>) => {
    setDirty(true);
    setRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  };

  const handleMoveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setDirty(true);
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next.map((r, idx) => ({ ...r, orderIndex: idx }));
    });
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setDirty(true);
    setRows((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((r, idx) => ({ ...r, orderIndex: idx })),
    );
  };

  const handleAddRow = () => {
    setDirty(true);
    setRows((prev) => [
      ...prev,
      {
        name: getStageLabel("SCREENING", t),
        category: "SCREENING",
        orderIndex: prev.length,
        color: null,
        isTerminal: false,
      },
    ]);
  };

  const handleSave = async () => {
    const payload: UpsertPipelineStagesSchema["stages"] = rows.map(
      (row, idx) => ({
        ...(row.id ? { id: row.id } : {}),
        name: row.name.trim() || getStageLabel(row.category, t),
        category: row.category,
        orderIndex: idx,
        color: row.color ?? null,
        isTerminal:
          row.category === "HIRED" || row.category === "REJECTED"
            ? true
            : Boolean(row.isTerminal),
      }),
    );

    try {
      await updateStagesMutation.mutateAsync({ jobId, stages: payload });
      setDirty(false);
      toast.success(t("common.updated"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t("dashboard.hiringPipelineTitle")}</CardTitle>
          <CardDescription>{t("pipeline.dragDropHint")}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={isLoading || updateStagesMutation.isPending}
          >
            <Plus className="size-4" />
            <span>{t("common.create")}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isLoading || updateStagesMutation.isPending}
          >
            {updateStagesMutation.isPending
              ? t("common.saving")
              : t("common.save")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={row.id ?? `draft-${idx}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2"
          >
            <Input
              value={row.name}
              aria-label={t("jobs.tabs.pipeline")}
              onChange={(e) => handleUpdateRow(idx, { name: e.target.value })}
              className="min-w-44 flex-1"
            />
            <select
              value={row.category}
              aria-label={t("common.status")}
              onChange={(e) =>
                handleUpdateRow(idx, {
                  category: e.target.value as ApplicationStage,
                })
              }
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
            >
              {STAGES_ORDER.map((category) => (
                <option key={category} value={category}>
                  {getStageLabel(category, t)}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.previous")}
                disabled={idx === 0}
                onClick={() => handleMoveRow(idx, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.next")}
                disabled={idx === rows.length - 1}
                onClick={() => handleMoveRow(idx, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.delete")}
                disabled={rows.length <= 1}
                onClick={() => handleRemoveRow(idx)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
