"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  useMemo,
  type ReactNode,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "cn";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: ReactNode;
  keywords?: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  popupClassName?: string;
  align?: "left" | "right";
  direction?: "auto" | "up" | "down";
  disabled?: boolean;
  icon?: ComponentType<{ className?: string }>;
  variant?: "default" | "landing";
  size?: "sm" | "default";
  id?: string;
  name?: string;
  "aria-label"?: string;
}

interface PopupCoords {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  searchPlaceholder = "",
  emptyText = "—",
  className,
  triggerClassName,
  popupClassName,
  align = "left",
  direction = "auto",
  disabled = false,
  icon: LeadingIcon,
  variant = "default",
  size = "default",
  id,
  name,
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PopupCoords | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState("");

  const reactId = useId();
  const selectId = id || reactId;
  const listboxId = `${selectId}-listbox`;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((opt) => {
      const labelText =
        typeof opt.label === "string" || typeof opt.label === "number"
          ? String(opt.label)
          : "";
      return (
        labelText.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query) ||
        (opt.keywords?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [options, searchable, searchQuery]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateCoords = useCallback((): PopupCoords | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp =
      direction === "up" ||
      (direction !== "down" && spaceBelow < 220 && rect.top > 160);

    const minWidth = Math.max(rect.width, 140);
    let left = rect.left;

    if (align === "right") {
      left = rect.right - minWidth;
    }

    // Clamp within viewport
    if (left < 8) left = 8;
    if (left + minWidth > window.innerWidth - 8) {
      left = window.innerWidth - minWidth - 8;
    }

    if (shouldOpenUp) {
      return {
        bottom: window.innerHeight - rect.top + 6,
        left,
        minWidth,
      };
    } else {
      return {
        top: rect.bottom + 6,
        left,
        minWidth,
      };
    }
  }, [align, direction]);

  const updateCoords = useCallback(() => {
    const nextCoords = calculateCoords();
    if (nextCoords) {
      setCoords(nextCoords);
    }
  }, [calculateCoords]);

  const openSelect = useCallback(() => {
    if (disabled) return;
    const nextCoords = calculateCoords();
    if (nextCoords) {
      setCoords(nextCoords);
    }
    setSearchQuery("");
    const selectedIdx = options.findIndex((opt) => opt.value === value);
    if (selectedIdx >= 0) {
      setFocusedIndex(selectedIdx);
    } else {
      const firstNonDisabled = options.findIndex((opt) => !opt.disabled);
      setFocusedIndex(firstNonDisabled >= 0 ? firstNonDisabled : 0);
    }
    setIsOpen(true);
    if (searchable) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [disabled, calculateCoords, options, value, searchable]);

  const closeSelect = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    setSearchQuery("");
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    if (!isOpen) {
      openSelect();
    } else {
      closeSelect(false);
    }
  }, [disabled, isOpen, openSelect, closeSelect]);

  // Click outside and resize listeners
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }
      closeSelect(false);
    }

    function handleScrollOrResize() {
      updateCoords();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updateCoords, closeSelect]);

  // Auto-scroll active option into view when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && popupRef.current) {
      const activeElem = popupRef.current.querySelector(
        `#${listboxId}-opt-${focusedIndex}`,
      );
      if (
        activeElem &&
        typeof (activeElem as HTMLElement).scrollIntoView === "function"
      ) {
        (activeElem as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, focusedIndex, listboxId]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        openSelect();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeSelect(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = prev + 1;
        while (
          next < filteredOptions.length &&
          filteredOptions[next].disabled
        ) {
          next++;
        }
        return next < filteredOptions.length ? next : prev;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && filteredOptions[next].disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      const first = filteredOptions.findIndex((opt) => !opt.disabled);
      if (first >= 0) setFocusedIndex(first);
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = filteredOptions.length - 1; i >= 0; i--) {
        if (!filteredOptions[i].disabled) {
          setFocusedIndex(i);
          break;
        }
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (e.key === " " && document.activeElement === searchInputRef.current) {
        return;
      }
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        const opt = filteredOptions[focusedIndex];
        if (!opt.disabled) {
          onChange(opt.value);
          closeSelect(true);
        }
      }
    } else if (e.key === "Tab") {
      closeSelect(false);
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const isLanding = variant === "landing";
  const SelectedIcon = selectedOption?.icon || LeadingIcon;

  const dropdownPopup = isOpen && mounted && coords && (
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

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "relative inline-block text-left min-w-0 max-w-full",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Hidden input for form compatibility if name is provided */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      <button
        ref={triggerRef}
        type="button"
        id={id ? `${id}-trigger` : undefined}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && focusedIndex >= 0
            ? `${listboxId}-opt-${focusedIndex}`
            : undefined
        }
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          toggleOpen();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl font-normal transition-all cursor-pointer select-none min-w-0 max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900",
          size === "sm"
            ? "px-2.5 py-1.5 text-xs"
            : "px-3 py-2 text-xs sm:text-sm",
          disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : "active:scale-[0.98]",
          isLanding
            ? "bg-white/10 hover:bg-white/15 border border-white/10 text-cyan-200 shadow-sm"
            : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs",
          triggerClassName,
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {SelectedIcon && (
            <SelectedIcon
              className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400"
              aria-hidden="true"
            />
          )}
          <span className="truncate block">
            {selectedOption ? selectedOption.label : placeholder || value}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-1.5",
            isLanding
              ? "text-cyan-300/80"
              : "text-slate-400 dark:text-slate-400",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Render dropdown menu in Portal so it never gets clipped by parent overflow */}
      {dropdownPopup && createPortal(dropdownPopup, document.body)}
    </div>
  );
}
