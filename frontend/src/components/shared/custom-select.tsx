"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  popupClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "landing";
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
  className,
  triggerClassName,
  popupClassName,
  align = "left",
  disabled = false,
  icon: LeadingIcon,
  variant = "default",
  size = "default",
  id,
  name,
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const isLanding = variant === "landing";

  const SelectedIcon = selectedOption?.icon || LeadingIcon;

  return (
    <div
      ref={dropdownRef}
      className={cn("relative inline-block text-left", className)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Hidden input for form compatibility if name is provided */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl font-semibold transition-all cursor-pointer outline-none select-none",
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs sm:text-sm",
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "active:scale-[0.98]",
          isLanding
            ? "bg-white/10 hover:bg-white/15 border border-white/10 text-cyan-200 shadow-sm"
            : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {SelectedIcon && (
            <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder || value}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ml-1.5",
            isLanding ? "text-cyan-300/80" : "text-slate-400 dark:text-slate-400",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            "absolute mt-1.5 min-w-[140px] w-full max-h-60 overflow-y-auto rounded-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 border shadow-2xl custom-scrollbar",
            align === "right" ? "right-0" : "left-0",
            isLanding
              ? "bg-[#0b152d]/95 backdrop-blur-xl border-white/15 text-white"
              : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200",
            popupClassName
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const OptionIcon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer",
                  option.disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "",
                  isSelected
                    ? isLanding
                      ? "bg-blue-600/30 text-cyan-300 font-bold border border-blue-400/20 shadow-xs"
                      : "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                    : isLanding
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {OptionIcon && (
                    <OptionIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-400"
                      )}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && (
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 ml-2",
                      isLanding ? "text-cyan-300" : "text-blue-600 dark:text-blue-400"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
