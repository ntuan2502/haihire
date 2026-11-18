"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  useMemo,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import {
  CustomSelectPopup,
  type PopupCoords,
  type CustomSelectOptionItem,
} from "./custom-select-popup";

export type CustomSelectOption<T extends string = string> =
  CustomSelectOptionItem<T>;

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
  size?: "sm" | "default";
  id?: string;
  name?: string;
  "aria-label"?: string;
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
  const SelectedIcon = selectedOption?.icon || LeadingIcon;

  const dropdownPopup = (
    <CustomSelectPopup
      isOpen={isOpen}
      mounted={mounted}
      coords={coords}
      listboxId={listboxId}
      popupRef={popupRef}
      ariaLabel={ariaLabel}
      placeholder={typeof placeholder === "string" ? placeholder : undefined}
      popupClassName={popupClassName}
      searchable={searchable}
      searchInputRef={searchInputRef}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      setFocusedIndex={setFocusedIndex}
      handleKeyDown={handleKeyDown}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      filteredOptions={filteredOptions}
      value={value}
      focusedIndex={focusedIndex}
      onChange={onChange}
      closeSelect={closeSelect}
    />
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
          "w-full flex items-center justify-between gap-2 rounded-md font-normal transition-colors cursor-pointer select-none min-w-0 max-w-full focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 border border-input bg-transparent dark:bg-input/30 hover:bg-accent/40 text-foreground shadow-xs",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-xs sm:text-sm",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          triggerClassName,
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {SelectedIcon && (
            <SelectedIcon
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <span className="truncate block">
            {selectedOption ? selectedOption.label : placeholder || value}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-1.5 text-muted-foreground",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Render dropdown menu in Portal so it never gets clipped by parent overflow */}
      {isOpen &&
        mounted &&
        coords &&
        createPortal(dropdownPopup, document.body)}
    </div>
  );
}
