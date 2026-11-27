"use client";

import {
  Fragment,
  type RefObject,
  type ReactNode,
  type ComponentType,
} from "react";
import { Check, Search } from "lucide-react";
import { cn } from "cn";
import { PopoverContent } from "@/components/ui/popover";

export interface CustomSelectOptionItem<T extends string = string> {
  value: T;
  label: ReactNode;
  group?: string;
  keywords?: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface CustomSelectPopupProps<T extends string = string> {
  align: "left" | "right";
  direction: "auto" | "up" | "down";
  dropdownRef: RefObject<HTMLDivElement | null>;
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
  align,
  direction,
  dropdownRef,
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
  return (
    <PopoverContent
      ref={popupRef}
      align={align === "right" ? "end" : "start"}
      side={direction === "up" ? "top" : "bottom"}
      sideOffset={6}
      avoidCollisions={direction === "auto"}
      collisionPadding={8}
      id={listboxId}
      role="listbox"
      data-custom-select-popup="true"
      aria-label={
        ariaLabel || (typeof placeholder === "string" ? placeholder : undefined)
      }
      aria-activedescendant={
        focusedIndex >= 0 ? `${listboxId}-opt-${focusedIndex}` : undefined
      }
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        if (searchable) {
          searchInputRef.current?.focus();
        }
      }}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSelect(true);
      }}
      onPointerDownOutside={(e) => {
        if (dropdownRef.current?.contains(e.target as Node)) {
          e.preventDefault();
        }
      }}
      onInteractOutside={(e) => {
        if (dropdownRef.current?.contains(e.target as Node)) {
          e.preventDefault();
        }
      }}
      onKeyDown={handleKeyDown}
      style={{
        minWidth: "max(var(--radix-popover-trigger-width, 0px), 140px)",
        maxWidth: "calc(100vw - 16px)",
      }}
      className={cn(
        "pointer-events-auto w-auto flex flex-col overflow-hidden rounded-lg p-1 shadow-md",
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
            const showGroupHeader = Boolean(
              option.group &&
              option.group !== filteredOptions[index - 1]?.group,
            );

            return (
              <Fragment key={option.value}>
                {showGroupHeader && (
                  <div
                    role="presentation"
                    className={cn(
                      "px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none",
                      index > 0 && "mt-1 border-t border-border",
                    )}
                  >
                    {option.group}
                  </div>
                )}
                <button
                  id={`${listboxId}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onMouseDown={(e) => {
                    // Keep focus inside Radix Dialog/Sheet FocusScope when selecting portaled options
                    e.preventDefault();
                  }}
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
                    <span className="truncate block flex-1 min-w-0">
                      {option.label}
                    </span>
                  </div>
                  {isSelected && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 ml-2 text-foreground"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </Fragment>
            );
          })
        )}
      </div>
    </PopoverContent>
  );
}
