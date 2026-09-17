"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { useI18n } from "@/i18n";

export interface OverviewSectionsState {
  ai: boolean;
  interviews: boolean;
  documents: boolean;
  responses: boolean;
  notes: boolean;
  properties: boolean;
}

export const DEFAULT_OVERVIEW_SECTIONS: OverviewSectionsState = {
  ai: true,
  interviews: true,
  documents: true,
  responses: true,
  notes: true,
  properties: true,
};

interface OverviewSectionsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  sections: OverviewSectionsState;
  onToggleSection: (key: keyof OverviewSectionsState) => void;
  triggerRef: RefObject<HTMLElement | null>;
}

export function OverviewSectionsPopover({
  isOpen,
  onClose,
  sections,
  onToggleSection,
  triggerRef,
}: OverviewSectionsPopoverProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  const sectionItems: { key: keyof OverviewSectionsState; label: string }[] = [
    { key: "ai", label: t("applications.sections.ai") },
    { key: "interviews", label: t("applications.sections.interviews") },
    { key: "documents", label: t("applications.sections.documents") },
    { key: "responses", label: t("applications.sections.responses") },
    { key: "notes", label: t("applications.sections.notes") },
    { key: "properties", label: t("applications.sections.properties") },
  ];
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const popoverWidth = 192; // w-48
        let left = rect.left - 50;
        if (typeof window !== "undefined") {
          if (left + popoverWidth > window.innerWidth - 8) {
            left = window.innerWidth - popoverWidth - 8;
          }
        }
        if (left < 8) left = 8;

        setCoords({
          top: rect.bottom + 6,
          left,
        });
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (popoverRef.current && popoverRef.current.contains(target)) ||
        (triggerRef.current && triggerRef.current.contains(target))
      ) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, mounted, onClose, triggerRef]);

  if (!mounted || !isOpen || !coords) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        zIndex: 99999,
      }}
      className="w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl py-2 animate-in fade-in-0 zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {t("applications.sections.sectionsTitle")}
      </div>

      <div className="space-y-0.5">
        {sectionItems.map(({ key, label }) => {
          const isChecked = sections[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleSection(key)}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
            >
              <div
                className={`h-4 w-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                  isChecked
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                }`}
              >
                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
