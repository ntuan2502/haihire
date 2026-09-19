"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { DEFAULT_PAGE_SIZE } from "@/components/shared/pagination";

export interface UseTableParamsOptions {
  defaultLimit?: number;
  debounceMs?: number;
}

export function useTableParams(options?: UseTableParamsOptions) {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_PAGE_SIZE;
  const debounceMs = options?.debounceMs ?? 300;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Helper to parse page from searchParams
  const getUrlPage = useCallback((params: URLSearchParams) => {
    const raw = params.get("page");
    const num = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(num) && num > 0 ? num : 1;
  }, []);

  // Helper to parse limit from searchParams
  const getUrlLimit = useCallback(
    (params: URLSearchParams) => {
      const raw = params.get("limit");
      const num = raw ? parseInt(raw, 10) : defaultLimit;
      return Number.isFinite(num) && num > 0 ? num : defaultLimit;
    },
    [defaultLimit],
  );

  // Maintain an in-memory mutable URLSearchParams ref so sequential calls
  // in the same tick / event handler never overwrite each other with stale closures.
  const currentParamsRef = useRef<URLSearchParams>(
    new URLSearchParams(searchParams.toString()),
  );

  // Local state for immediate UI feedback (0ms latency, optimistic)
  const [page, setLocalPage] = useState(() => getUrlPage(searchParams));
  const [limit, setLocalLimit] = useState(() => getUrlLimit(searchParams));
  const [searchParam, setSearchParam] = useState(
    () => searchParams.get("search") || "",
  );
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") || "",
  );

  // Keep in-memory ref and local state in sync when searchParams change externally (F5, back/forward)
  useEffect(() => {
    const fresh = new URLSearchParams(searchParams.toString());
    currentParamsRef.current = fresh;
    setLocalPage(getUrlPage(fresh));
    setLocalLimit(getUrlLimit(fresh));
    const urlSearch = fresh.get("search") || "";
    setSearchParam(urlSearch);
    setSearchInput(urlSearch);
  }, [searchParams, getUrlPage, getUrlLimit]);

  // Core URL update function
  const updateUrl = useCallback(
    (
      updates: Record<string, string | number | undefined | null>,
      shouldResetPage = false,
    ) => {
      const current = currentParamsRef.current;

      if (shouldResetPage) {
        current.delete("page");
      }

      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined || val === null || val === "" || val === "ALL") {
          current.delete(key);
        } else if (key === "page" && Number(val) === 1) {
          current.delete("page");
        } else if (key === "limit" && Number(val) === defaultLimit) {
          current.delete("limit");
        } else {
          current.set(key, String(val));
        }
      }

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    },
    [pathname, router, defaultLimit],
  );

  // Debounce search input to URL
  useEffect(() => {
    if (searchInput === searchParam) return;

    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearchParam(trimmed);
      setLocalPage(1);
      updateUrl({ search: trimmed }, true);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchInput, searchParam, debounceMs, updateUrl]);

  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, newPage);
      setLocalPage(validPage);
      updateUrl({ page: validPage }, false);
    },
    [updateUrl],
  );

  const setLimit = useCallback(
    (newLimit: number) => {
      const validLimit = Math.max(1, newLimit);
      setLocalLimit(validLimit);
      setLocalPage(1);
      updateUrl({ limit: validLimit }, true);
    },
    [updateUrl],
  );

  const setParam = useCallback(
    (
      key: string,
      value: string | number | undefined | null,
      resetPage = true,
    ) => {
      if (resetPage) {
        setLocalPage(1);
      }
      updateUrl({ [key]: value }, resetPage);
    },
    [updateUrl],
  );

  const setParams = useCallback(
    (
      newParams: Record<string, string | number | undefined | null>,
      resetPage = true,
    ) => {
      if (resetPage) {
        setLocalPage(1);
      }
      updateUrl(newParams, resetPage);
    },
    [updateUrl],
  );

  const getParam = useCallback(
    (key: string, defaultValue = ""): string => {
      return currentParamsRef.current.get(key) ?? defaultValue;
    },
    [],
  );

  return {
    page,
    limit,
    search: searchParam,
    searchInput,
    setSearchInput,
    setPage,
    setLimit,
    setParam,
    setParams,
    getParam,
    searchParams,
  };
}
