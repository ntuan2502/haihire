"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useOptionalI18n } from "@/i18n/optional";
import { SlideOver } from "./slide-over";

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  hasActiveFilters?: boolean;
  onReset: () => void;
  resetLabel?: string;
  doneLabel?: string;
  children: ReactNode;
}

export function FilterDrawer({
  isOpen,
  onClose,
  title,
  description,
  hasActiveFilters = true,
  onReset,
  resetLabel,
  doneLabel,
  children,
}: FilterDrawerProps) {
  const { t } = useOptionalI18n();

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
        {children}
      </div>

      <div className="px-6 py-3.5 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{resetLabel || t("jobs.resetAll")}</span>
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onClose}
          className="h-8 px-4 text-xs font-semibold cursor-pointer"
        >
          {doneLabel || t("jobs.done")}
        </Button>
      </div>
    </SlideOver>
  );
}

export interface FilterPillOption<T extends string = string> {
  value: T;
  label: string;
}

export interface FilterPillGroupProps<T extends string = string> {
  label: string;
  options: FilterPillOption<T>[];
  selected: T | T[];
  onToggle: (value: T) => void;
  columns?: 2 | 3 | "wrap";
}

export function FilterPillGroup<T extends string = string>({
  label,
  options,
  selected,
  onToggle,
  columns = "wrap",
}: FilterPillGroupProps<T>) {
  const isSelected = (val: T) =>
    Array.isArray(selected) ? selected.includes(val) : selected === val;

  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-foreground">{label}</h4>
      <div
        className={cn(
          columns === 2
            ? "grid grid-cols-2 gap-2"
            : columns === 3
              ? "grid grid-cols-3 gap-2"
              : "flex flex-wrap gap-2",
        )}
      >
        {options.map((opt) => {
          const active = isSelected(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                active
                  ? "bg-primary/10 text-primary border-primary/40 shadow-2xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
