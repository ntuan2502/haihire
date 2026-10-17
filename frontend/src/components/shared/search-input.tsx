"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export interface SearchInputProps {
  /** The committed search query value (usually from URL / useTableParams.search) */
  value?: string;
  /** Callback fired when the search value commits (debounced, on Enter, or on clear) */
  onChange?: (value: string) => void;
  /** Optional callback fired on every raw keystroke if parent wants to monitor input */
  onInputChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms (defaults to 250ms for snappy responsiveness) */
  debounceMs?: number;
  /** Additional container classes */
  className?: string;
  /** Additional input classes */
  inputClassName?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Accessible label */
  ariaLabel?: string;
  "aria-label"?: string;
}

export function SearchInput({
  value = "",
  onChange,
  onInputChange,
  placeholder,
  debounceMs = 250,
  className,
  inputClassName,
  autoFocus,
  ariaLabel,
  "aria-label": ariaLabelKebab,
}: SearchInputProps) {
  // Local state keeps keystrokes isolated from heavy parent table re-renders,
  // guaranteeing 0ms typing latency and 60+ FPS UI responsiveness.
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes (e.g. F5, URL back/forward, external resets)
  // Preserves trailing spaces while typing so user's draft is never overwritten.
  useEffect(() => {
    setLocalValue((prev) => {
      if (prev === value || prev.trim() === value) {
        return prev;
      }
      return value;
    });
  }, [value]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commitValue = useCallback(
    (val: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onChange?.(val.trim());
    },
    [onChange],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setLocalValue(nextVal);
    onInputChange?.(nextVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Immediate commit when clearing
    if (nextVal === "") {
      commitValue("");
      return;
    }

    timerRef.current = setTimeout(() => {
      commitValue(nextVal);
    }, debounceMs);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitValue(localValue);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setLocalValue("");
      commitValue("");
    }
  };

  const handleClear = () => {
    setLocalValue("");
    commitValue("");
    inputRef.current?.focus();
  };

  const resolvedAriaLabel =
    ariaLabelKebab || ariaLabel || placeholder || "Search";

  return (
    <div className={cn("relative flex-1 min-w-0 w-full", className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={resolvedAriaLabel}
        className={cn(
          "h-9 pl-9 pr-8 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs w-full transition-colors",
          inputClassName,
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
