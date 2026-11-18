"use client";

import { useState, useRef, useEffect } from "react";
import { Columns3 } from "lucide-react";
import { useI18n } from "@/i18n";

export interface CandidateVisibleColumns {
  name: boolean;
  email: boolean;
  phone: boolean;
  applications: boolean;
  added: boolean;
  quickNotes: boolean;
  [key: string]: boolean;
}

export interface CandidatesColumnPickerProps {
  visibleColumns: CandidateVisibleColumns;
  toggleColumn: (key: keyof CandidateVisibleColumns) => void;
}

export function CandidatesColumnPicker({
  visibleColumns,
  toggleColumn,
}: CandidatesColumnPickerProps) {
  const { t } = useI18n();
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnsRef.current &&
        !columnsRef.current.contains(event.target as Node)
      ) {
        setIsColumnsOpen(false);
      }
    }
    if (isColumnsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isColumnsOpen]);

  const columnDefinitions: {
    id: keyof CandidateVisibleColumns;
    label: string;
    locked?: boolean;
  }[] = [
    {
      id: "name",
      label: t("candidates.columns.name"),
      locked: true,
    },
    { id: "email", label: t("candidates.columns.email") },
    { id: "phone", label: t("candidates.columns.phone") },
    {
      id: "applications",
      label: t("candidates.columns.applications"),
    },
    { id: "added", label: t("candidates.columns.added") },
    {
      id: "quickNotes",
      label: t("candidates.columns.quickNotes"),
    },
  ];

  return (
    <div className="relative shrink-0" ref={columnsRef}>
      <button
        type="button"
        onClick={() => setIsColumnsOpen((prev) => !prev)}
        className={`h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
          isColumnsOpen ? "ring-2 ring-ring/30 border-ring" : ""
        }`}
      >
        <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{t("common.columns")}</span>
      </button>

      {isColumnsOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-1.5 z-50">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase select-none">
            {t("candidates.toggleColumns")}
          </div>
          <div className="space-y-0.5 mt-1">
            {columnDefinitions.map((col) => {
              const isChecked = visibleColumns[col.id];
              const isLocked = col.locked;
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium select-none transition-colors ${
                    isLocked
                      ? "opacity-60 cursor-not-allowed text-muted-foreground"
                      : "text-foreground hover:bg-accent cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    name={`col-${col.id}`}
                    aria-label={col.label}
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => toggleColumn(col.id)}
                    className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
