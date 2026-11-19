"use client";

import type { RefObject } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/i18n";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

export interface OverviewSectionsState {
  ai: boolean;
  interviews: boolean;
  documents: boolean;
  responses: boolean;
  notes: boolean;
}

export const DEFAULT_OVERVIEW_SECTIONS: OverviewSectionsState = {
  ai: true,
  interviews: true,
  documents: true,
  responses: true,
  notes: true,
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

  const sectionItems: { key: keyof OverviewSectionsState; label: string }[] = [
    { key: "ai", label: t("applications.sections.ai") },
    { key: "interviews", label: t("applications.sections.interviews") },
    { key: "documents", label: t("applications.sections.documents") },
    { key: "responses", label: t("applications.sections.responses") },
    { key: "notes", label: t("applications.sections.notes") },
  ];

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <PopoverAnchor virtualRef={triggerRef} />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-48 rounded-xl p-2"
        onPointerDownOutside={(e) => {
          if (triggerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (triggerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("applications.sections.sectionsTitle")}
        </div>

        <div className="space-y-0.5">
          {sectionItems.map(({ key, label }) => {
            const isChecked = sections[key];
            return (
              <button
                key={key}
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => onToggleSection(key)}
                className="w-full rounded-md px-2 py-1.5 flex items-center gap-2.5 hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                    isChecked
                      ? "bg-primary text-primary-foreground"
                      : "border border-input bg-background"
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-medium text-foreground">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
