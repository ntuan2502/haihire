"use client";

import { cn } from "cn";
import { Check } from "lucide-react";
import { useOptionalI18n } from "@/i18n/optional";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  /** Single-select mode: active tab ID */
  activeTab?: T;
  /** Single-select mode: callback when tab changes */
  onChange?: (tabId: T) => void;
  /** Multi-select mode: enable toggle pills */
  multiSelect?: boolean;
  /** Multi-select mode: list of active tab IDs */
  activeTabs?: T[];
  /** Multi-select mode: callback when toggling a tab */
  onToggleTab?: (tabId: T) => void;
  /** Multi-select mode: special tab ID representing "All" (defaults to "ALL") */
  allTabId?: T;
  /** Multi-select mode: callback when user clicks "All" */
  onClearAll?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  multiSelect = false,
  activeTabs = [],
  onToggleTab,
  allTabId = "ALL" as T,
  onClearAll,
  className,
  size = "sm",
}: SegmentedTabsProps<T>) {
  const { t } = useOptionalI18n();

  if (multiSelect) {
    const isAllActive = activeTabs.length === 0;

    return (
      <div
        role="group"
        aria-label={t("common.filterStatusTabs")}
        className={cn(
          "inline-flex items-center p-1 bg-muted rounded-lg border border-border max-w-full overflow-x-auto scrollbar-none shrink-0 gap-1",
          className,
        )}
      >
        {tabs.map((tab) => {
          const isAllTab = tab.id === allTabId;
          const isActive = isAllTab ? isAllActive : activeTabs.includes(tab.id);

          const handleClick = () => {
            if (isAllTab) {
              onClearAll?.();
            } else {
              onToggleTab?.(tab.id);
            }
          };

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={handleClick}
              className={cn(
                "flex items-center gap-1.5 rounded-md whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 select-none",
                size === "sm"
                  ? "px-3 py-1.5 text-xs"
                  : "px-3.5 py-2 text-xs sm:text-sm",
                isActive
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground font-medium hover:text-foreground hover:bg-background/50",
              )}
            >
              {!isAllTab && isActive && (
                <Check className="h-3 w-3 text-foreground stroke-[2.5]" />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-sm text-[10px] font-semibold transition-colors leading-none",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-background/70 text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Single-select mode fallback
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center p-1 bg-muted rounded-lg border border-border max-w-full overflow-x-auto scrollbar-none shrink-0 gap-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 select-none",
              size === "sm"
                ? "px-3 py-1.5 text-xs"
                : "px-3.5 py-2 text-xs sm:text-sm",
              isActive
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground font-medium hover:text-foreground hover:bg-background/50",
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-sm text-[10px] font-semibold transition-colors leading-none",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background/70 text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
