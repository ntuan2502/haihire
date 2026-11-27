"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  AiConnectionResponse,
  AiProxyMode,
  AiRouteTarget,
} from "@haihire/shared";
import { AlertTriangle, Clock, GripVertical, Trash2 } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  AI_PROVIDER_SHORT_LABELS,
  buildProviderModelOptions,
  getConnectionHealthIssue,
} from "./ai-provider-ui";

export interface AiRouteTargetPoolProps {
  poolId: string;
  mode: AiProxyMode;
  targets: AiRouteTarget[];
  connections: AiConnectionResponse[];
  disabled?: boolean;
  onChange: (next: AiRouteTarget[]) => void;
}

function ConnectionIssueBadge({ conn }: { conn: AiConnectionResponse }) {
  const { t } = useI18n();
  const issue = getConnectionHealthIssue(conn);
  if (!issue) return null;

  if (issue === "disabled") {
    return (
      <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
        {t("settings.integrations.ai.disabledBadge")}
      </Badge>
    );
  }

  if (issue === "cooldown") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 shrink-0">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {t("settings.integrations.ai.cooldownBadge", {
          sec: conn.cooldownRemainingSec,
        })}
      </span>
    );
  }

  return (
    <span
      title={conn.lastError || undefined}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive shrink-0"
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {t("settings.integrations.ai.statusError")}
    </span>
  );
}

interface SortableTargetRowProps {
  rowKey: string;
  mode: AiProxyMode;
  target: AiRouteTarget;
  index: number;
  canDrag: boolean;
  disabled: boolean;
  connections: AiConnectionResponse[];
  onChange: (next: AiRouteTarget) => void;
  onRemove: () => void;
}

function SortableTargetRow({
  rowKey,
  mode,
  target,
  index,
  canDrag,
  disabled,
  connections,
  onChange,
  onRemove,
}: SortableTargetRowProps) {
  const { t } = useI18n();
  const conn = connections.find((c) => c.id === target.connectionId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: target.connectionId,
    disabled: disabled || !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const modelOptions = conn
    ? [
        {
          value: "",
          label: `${t("settings.integrations.ai.useConnectionDefaultModel")} · ${conn.defaultModelId}`,
        },
        ...buildProviderModelOptions(conn.provider, t, target.modelId),
      ]
    : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-border bg-card p-2.5 space-y-2 transition-shadow",
        isDragging &&
          "opacity-75 shadow-md ring-1 ring-primary/40 z-10 relative",
      )}
    >
      {/* Top Line: Handle + Priority + Name + Short Provider + Warning + Delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {canDrag && (
            <button
              type="button"
              disabled={disabled}
              aria-label={t("settings.integrations.ai.dragToReorderLabel")}
              title={t("settings.integrations.ai.dragToReorderLabel")}
              className="inline-flex h-7 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-grab active:cursor-grabbing disabled:opacity-40 disabled:cursor-not-allowed"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {mode === "FAILOVER" && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono h-5 shrink-0"
            >
              #{index + 1}
            </Badge>
          )}

          <span className="text-xs font-medium text-foreground truncate">
            {conn ? conn.name : target.connectionId}
          </span>

          {conn && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium h-5 shrink-0"
            >
              {AI_PROVIDER_SHORT_LABELS[conn.provider] || conn.provider}
            </Badge>
          )}

          {conn && <ConnectionIssueBadge conn={conn} />}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={() => {
            if (!disabled) onRemove();
          }}
          aria-label={t("settings.integrations.ai.removeTargetLabel")}
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive cursor-pointer disabled:cursor-not-allowed"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Bottom Line: Model Override + Optional Weight */}
      {(conn || mode === "LOAD_BALANCE") && (
        <div className={cn("flex items-center gap-2", canDrag && "pl-7")}>
          {conn && (
            <div className="flex-1 min-w-0">
              <CustomSelect
                id={`${rowKey}-model`}
                searchable
                disabled={disabled}
                value={target.modelId || ""}
                onChange={(val) => {
                  if (disabled) return;
                  onChange({
                    ...target,
                    modelId: val ? val : null,
                  });
                }}
                options={modelOptions}
                aria-label={t("settings.integrations.ai.modelOverrideLabel")}
                className="w-full"
              />
            </div>
          )}

          {mode === "LOAD_BALANCE" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <label
                htmlFor={`${rowKey}-weight`}
                className="text-[11px] text-muted-foreground whitespace-nowrap"
              >
                {t("settings.integrations.ai.weightLabel")}
              </label>
              <Input
                id={`${rowKey}-weight`}
                type="number"
                min={1}
                max={100}
                disabled={disabled}
                value={target.weight}
                onChange={(e) => {
                  if (disabled) return;
                  const parsed = Number.parseInt(e.target.value, 10);
                  onChange({
                    ...target,
                    weight: Number.isFinite(parsed)
                      ? Math.max(1, Math.min(100, parsed))
                      : 1,
                  });
                }}
                className="h-9 w-16 text-xs text-center bg-background"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AiRouteTargetPool({
  poolId,
  mode,
  targets,
  connections,
  disabled = false,
  onChange,
}: AiRouteTargetPoolProps) {
  const { t } = useI18n();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedIds = new Set(targets.map((tgt) => tgt.connectionId));
  const availableToAdd = connections.filter((c) => !selectedIds.has(c.id));

  if (mode === "SINGLE") {
    const first = targets[0] ?? null;
    const singleOptions = [
      {
        value: "",
        label: t("settings.integrations.ai.selectConnectionPlaceholder"),
      },
      ...connections.map((c) => ({
        value: c.id,
        label: `${c.name} · ${AI_PROVIDER_SHORT_LABELS[c.provider] || c.provider} · ${c.defaultModelId}`,
      })),
    ];
    const selectedConn = first
      ? connections.find((c) => c.id === first.connectionId)
      : null;
    const modelOptions = selectedConn
      ? [
          {
            value: "",
            label: `${t("settings.integrations.ai.useConnectionDefaultModel")} · ${selectedConn.defaultModelId}`,
          },
          ...buildProviderModelOptions(
            selectedConn.provider,
            t,
            first?.modelId,
          ),
        ]
      : [];

    return (
      <div className="space-y-3">
        <CustomSelect
          id={`${poolId}-single-conn`}
          disabled={disabled}
          value={first?.connectionId || ""}
          onChange={(val) => {
            if (disabled) return;
            if (!val) {
              onChange([]);
              return;
            }
            onChange([{ connectionId: val, modelId: null, weight: 1 }]);
          }}
          options={singleOptions}
          aria-label={t("settings.integrations.ai.selectConnectionPlaceholder")}
          className="w-full"
        />

        {selectedConn && first && (
          <div className="space-y-2">
            {getConnectionHealthIssue(selectedConn) && (
              <div className="flex items-center gap-2">
                <ConnectionIssueBadge conn={selectedConn} />
              </div>
            )}
            <CustomSelect
              id={`${poolId}-single-model`}
              searchable
              disabled={disabled}
              value={first.modelId || ""}
              onChange={(val) => {
                if (disabled) return;
                onChange([
                  {
                    ...first,
                    modelId: val ? val : null,
                  },
                ]);
              }}
              options={modelOptions}
              aria-label={t("settings.integrations.ai.modelOverrideLabel")}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  const canDrag = targets.length > 1;

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = targets.findIndex(
      (item) => item.connectionId === String(active.id),
    );
    const newIndex = targets.findIndex(
      (item) => item.connectionId === String(over.id),
    );
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(targets, oldIndex, newIndex));
  };

  const addOptions = [
    {
      value: "",
      label: t("settings.integrations.ai.addTargetLabel"),
    },
    ...availableToAdd.map((c) => ({
      value: c.id,
      label: `${c.name} · ${AI_PROVIDER_SHORT_LABELS[c.provider] || c.provider}`,
    })),
  ];

  return (
    <div className="space-y-2.5">
      {targets.length === 0 ? (
        <div className="min-h-9 flex items-center rounded-lg border border-dashed border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground italic">
          {t("settings.integrations.ai.noTargetsHint")}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={targets.map((tgt) => tgt.connectionId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {targets.map((tgt, idx) => (
                <SortableTargetRow
                  key={`${poolId}-${tgt.connectionId}`}
                  rowKey={`${poolId}-${tgt.connectionId}`}
                  mode={mode}
                  target={tgt}
                  index={idx}
                  canDrag={canDrag}
                  disabled={disabled}
                  connections={connections}
                  onChange={(nextTarget) => {
                    if (disabled) return;
                    const copy = [...targets];
                    copy[idx] = nextTarget;
                    onChange(copy);
                  }}
                  onRemove={() => {
                    if (disabled) return;
                    onChange(targets.filter((_, i) => i !== idx));
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {availableToAdd.length > 0 && (
        <CustomSelect
          id={`${poolId}-add-target`}
          disabled={disabled}
          value=""
          onChange={(val) => {
            if (disabled || !val) return;
            onChange([
              ...targets,
              { connectionId: val, modelId: null, weight: 1 },
            ]);
          }}
          options={addOptions}
          aria-label={t("settings.integrations.ai.addTargetLabel")}
          className="w-full"
        />
      )}
    </div>
  );
}
