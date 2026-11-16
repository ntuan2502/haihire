"use client";

import { type RefObject, type ReactNode, type ComponentType } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "cn";

export interface CustomSelectOptionItem<T extends string = string> {
  value: T;
  label: ReactNode;
  keywords?: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface PopupCoords {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
}

interface CustomSelectPopupProps<T extends string = string> {
  isOpen: boolean;
  mounted: boolean;
  coords: PopupCoords | null;
  listboxId: string;
  popupRef: RefObject<HTMLDivElement | null>;
  ariaLabel?: string;
  placeholder?: string;
  isLanding: boolean;
  popupClassName?: string;
  searchable: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  searchPlaceholder?: string;
  emptyText: string;
  filteredOptions: CustomSelectOptionItem<T>[];
  value: T;
  focusedIndex: number;
  onChange: (value: T) => void;
  closeSelect: (restoreFocus?: boolean) => void;
}

export function CustomSelectPopup<T extends string = string>({
  isOpen,
  mounted,
  coords,
  listboxId,
  popupRef,
  ariaLabel,
  placeholder,
  isLanding,
  popupClassName,
  searchable,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  setFocusedIndex,
  handleKeyDown,
  searchPlaceholder,
  emptyText,
  filteredOptions,
  value,
  focusedIndex,
  onChange,
  closeSelect,
}: CustomSelectPopupProps<T>) {
  if (!isOpen || !mounted || !coords) return null;

  return (
    <div
      ref={popupRef}
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      aria-label={
        ariaLabel || (typeof placeholder === "string" ? placeholder : undefined)
      }
      aria-activedescendant={
        focusedIndex >= 0 ? `${listboxId}-opt-${focusedIndex}` : undefined
      }
      style={{
        position: "fixed",
        ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
        ...(coords.bottom !== undefined
          ? { bottom: `${coords.bottom}px` }
          : {}),
        left: `${coords.left}px`,
        minWidth: `${coords.minWidth}px`,
        maxWidth: "calc(100vw - 16px)",
      }}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl p-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-150 border shadow-2xl focus:outline-none",
        isLanding
          ? "bg-[#0b152d]/95 backdrop-blur-xl border-white/15 text-white"
          : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200",
        popupClassName,
      )}
    >
      {searchable && (
        <div
          className={cn(
            "px-1 pb-1.5 mb-1 border-b shrink-0",
            isLanding
              ? "border-white/10"
              : "border-slate-100 dark:border-slate-800",
          )}
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder || ariaLabel}
              className={cn(
                "w-full h-8 pl-8 pr-2.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500",
                isLanding
                  ? "bg-white/10 border-white/15 text-white placeholder:text-slate-400"
                  : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400",
              )}
            />
          </div>
        </div>
      )}
      <div className="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
            {emptyText}
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                id={`${listboxId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.value);
                  closeSelect(true);
                }}
                onMouseEnter={() => {
                  if (!option.disabled) setFocusedIndex(index);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer min-w-0 max-w-full focus:outline-none",
                  option.disabled
                    ? "opacity-40 cursor-not-allowed pointer-events-none"
                    : "",
                  isSelected
                    ? isLanding
                      ? "bg-blue-600/30 text-cyan-300 font-bold border border-blue-400/20 shadow-xs"
                      : "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                    : isLanding
                      ? isFocused
                        ? "bg-white/15 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                      : isFocused
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80",
                )}
              >
                <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                  {OptionIcon && (
                    <OptionIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-400",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate block">{option.label}</span>
                </div>
                {isSelected && (
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 ml-2",
                      isLanding
                        ? "text-cyan-300"
                        : "text-blue-600 dark:text-blue-400",
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
