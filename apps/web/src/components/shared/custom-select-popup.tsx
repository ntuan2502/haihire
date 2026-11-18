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
        "flex flex-col overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-150 border focus:outline-none rounded-lg p-1 shadow-md border-border bg-popover text-popover-foreground",
        popupClassName,
      )}
    >
      {searchable && (
        <div className="px-1 pb-1.5 mb-1 border-b border-border shrink-0">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
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
              className="w-full h-8 pl-8 pr-2.5 border text-xs rounded-md border-input bg-transparent dark:bg-input/30 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
        </div>
      )}
      <div className="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-3 text-center text-xs text-muted-foreground">
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
                  "w-full flex items-center justify-between gap-2 text-xs transition-colors text-left cursor-pointer min-w-0 max-w-full focus:outline-none px-2.5 py-1.5 rounded-md font-normal",
                  option.disabled
                    ? "opacity-40 cursor-not-allowed pointer-events-none"
                    : "",
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
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
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate block">{option.label}</span>
                </div>
                {isSelected && (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 ml-2 text-foreground"
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
