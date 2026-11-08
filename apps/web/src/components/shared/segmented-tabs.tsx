"use client";

import { cn } from "cn";
import { Check } from "lucide-react";

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
  if (multiSelect) {
    const isAllActive = activeTabs.length === 0;

    return (
      <div
        role="group"
        aria-label="Filter status tabs"
        className={cn(
          "inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-850 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 max-w-full overflow-x-auto scrollbar-none shrink-0 gap-1",
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
                "flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none",
                size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm",
                isActive
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40",
              )}
            >
              {!isAllTab && isActive && (
                <Check className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors leading-none",
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
                      : "bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
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
        "inline-flex items-center p-1 bg-slate-100/90 dark:bg-slate-850 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 max-w-full overflow-x-auto scrollbar-none shrink-0 gap-1",
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
              "flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 select-none",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm",
              isActive
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40",
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors leading-none",
                  isActive
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    : "bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
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
