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
        "flex flex-col overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-150 border focus:outline-none",
        isLanding
          ? "rounded-2xl p-1.5 shadow-2xl bg-[#0b152d]/95 backdrop-blur-xl border-white/15 text-white"
          : "rounded-lg p-1 shadow-md border-border bg-popover text-popover-foreground",
        popupClassName,
      )}
    >
      {searchable && (
        <div
          className={cn(
            "px-1 pb-1.5 mb-1 border-b shrink-0",
            isLanding ? "border-white/10" : "border-border",
          )}
        >
          <div className="relative">
            <Search
              className={cn(
                "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5",
                isLanding ? "text-slate-400" : "text-muted-foreground",
              )}
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
                "w-full h-8 pl-8 pr-2.5 border text-xs",
                isLanding
                  ? "rounded-lg bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  : "rounded-md border-input bg-transparent dark:bg-input/30 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              )}
            />
          </div>
        </div>
      )}
      <div className="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div
            className={cn(
              "px-3 py-3 text-center text-xs",
              isLanding ? "text-slate-400" : "text-muted-foreground",
            )}
          >
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
                  "w-full flex items-center justify-between gap-2 text-xs transition-colors text-left cursor-pointer min-w-0 max-w-full focus:outline-none",
                  isLanding
                    ? "px-3 py-2 rounded-xl font-medium"
                    : "px-2.5 py-1.5 rounded-md font-normal",
                  option.disabled
                    ? "opacity-40 cursor-not-allowed pointer-events-none"
                    : "",
                  isSelected
                    ? isLanding
                      ? "bg-blue-600/30 text-cyan-300 font-bold border border-blue-400/20 shadow-xs"
                      : "bg-accent text-accent-foreground font-medium"
                    : isLanding
                      ? isFocused
                        ? "bg-white/15 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                      : isFocused
                        ? "bg-accent/70 text-accent-foreground"
                        : "text-popover-foreground hover:bg-accent/60 hover:text-accent-foreground",
                )}
              >
                <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                  {OptionIcon && (
                    <OptionIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected
                          ? isLanding
                            ? "text-cyan-300"
                            : "text-foreground"
                          : isLanding
                            ? "text-slate-400"
                            : "text-muted-foreground",
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
                      isLanding ? "text-cyan-300" : "text-foreground",
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
