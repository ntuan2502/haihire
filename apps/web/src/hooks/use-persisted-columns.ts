"use client";

import { useState, useEffect, useCallback } from "react";

export function usePersistedColumns<T extends Record<string, boolean>>(
  storageKey: string,
  defaultColumns: T,
) {
  const [columns, setColumns] = useState<T>(defaultColumns);

  // Hydrate from localStorage once mounted on client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setColumns((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore localStorage errors (e.g. incognito/disabled)
    }
  }, [storageKey]);

  const toggleColumn = useCallback(
    (key: keyof T) => {
      setColumns((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    },
    [storageKey],
  );

  return { columns, toggleColumn };
}
